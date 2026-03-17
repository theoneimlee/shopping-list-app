const { chromium } = require('playwright');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function clearStorage(page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function addItem(page, text) {
  await page.fill('#itemInput', text);
  await page.click('button:has-text("추가")');
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(FILE_URL);
  await clearStorage(page);

  console.log('\n📋 [테스트 1] 초기 상태 확인');
  const emptyMsg = await page.locator('#empty').isVisible();
  assert(emptyMsg, '빈 상태 메시지가 보여야 함');

  const listItems = await page.locator('#list li').count();
  assert(listItems === 0, '아이템이 0개여야 함');

  const statsText = await page.locator('#stats').textContent();
  assert(statsText.trim() === '', '통계가 비어있어야 함');

  console.log('\n📋 [테스트 2] 아이템 추가 - 버튼 클릭');
  await addItem(page, '우유');
  const count1 = await page.locator('#list li').count();
  assert(count1 === 1, '아이템 1개 추가됨');

  const itemText = await page.locator('#list li .item-text').first().textContent();
  assert(itemText === '우유', '추가한 아이템 텍스트가 "우유"여야 함');

  const emptyHidden = await page.locator('#empty').isHidden();
  assert(emptyHidden, '아이템 추가 후 빈 상태 메시지가 숨겨져야 함');

  const inputValue = await page.locator('#itemInput').inputValue();
  assert(inputValue === '', '추가 후 입력 필드가 비워져야 함');

  console.log('\n📋 [테스트 3] 아이템 추가 - Enter 키');
  await page.fill('#itemInput', '계란');
  await page.press('#itemInput', 'Enter');
  const count2 = await page.locator('#list li').count();
  assert(count2 === 2, 'Enter 키로 아이템 추가됨 (총 2개)');

  await page.fill('#itemInput', '빵');
  await page.press('#itemInput', 'Enter');
  const count3 = await page.locator('#list li').count();
  assert(count3 === 3, '세 번째 아이템 추가됨 (총 3개)');

  console.log('\n📋 [테스트 4] 통계 표시 확인');
  const stats = await page.locator('#stats').textContent();
  assert(stats.includes('3'), '통계에 총 아이템 수(3) 표시됨');
  assert(stats.includes('0'), '통계에 완료(0) 표시됨');

  console.log('\n📋 [테스트 5] 빈 입력 추가 방지');
  await page.fill('#itemInput', '   ');
  await page.click('button:has-text("추가")');
  const count4 = await page.locator('#list li').count();
  assert(count4 === 3, '공백 입력 시 아이템이 추가되지 않아야 함');

  console.log('\n📋 [테스트 6] 체크 기능 (완료 표시)');
  const firstCheckbox = page.locator('#list li input[type="checkbox"]').first();
  await firstCheckbox.click();

  const isChecked = await firstCheckbox.isChecked();
  assert(isChecked, '첫 번째 아이템 체크박스가 체크됨');

  const hasCheckedClass = await page.locator('#list li').first().evaluate(el => el.classList.contains('checked'));
  assert(hasCheckedClass, '체크된 아이템에 "checked" 클래스 적용됨');

  const stats2 = await page.locator('#stats').textContent();
  assert(stats2.includes('완료 1'), '통계에 완료 1개 표시됨');

  console.log('\n📋 [테스트 7] 체크 해제 (토글)');
  await firstCheckbox.click();
  const isUnchecked = await firstCheckbox.isChecked();
  assert(!isUnchecked, '체크박스 다시 클릭 시 체크 해제됨');

  const hasNoCheckedClass = await page.locator('#list li').first().evaluate(el => !el.classList.contains('checked'));
  assert(hasNoCheckedClass, '체크 해제 시 "checked" 클래스 제거됨');

  console.log('\n📋 [테스트 8] 완료된 항목 삭제 버튼 표시');
  const clearBtnBefore = await page.locator('#clearBtn').isHidden();
  assert(clearBtnBefore, '완료 항목 없을 때 "완료된 항목 삭제" 버튼 숨김');

  await firstCheckbox.click();
  const clearBtnAfter = await page.locator('#clearBtn').isVisible();
  assert(clearBtnAfter, '완료 항목 있을 때 "완료된 항목 삭제" 버튼 표시됨');

  console.log('\n📋 [테스트 9] 개별 삭제 기능');
  const deleteButtons = page.locator('#list li .delete-btn');
  const secondDeleteBtn = deleteButtons.nth(1);
  await secondDeleteBtn.click();

  const count5 = await page.locator('#list li').count();
  assert(count5 === 2, '계란 삭제 후 아이템 2개 남음');

  const remainingTexts = await page.locator('#list li .item-text').allTextContents();
  assert(!remainingTexts.includes('계란'), '삭제한 "계란"이 목록에 없어야 함');
  assert(remainingTexts.includes('우유'), '"우유"는 여전히 존재해야 함');
  assert(remainingTexts.includes('빵'), '"빵"은 여전히 존재해야 함');

  console.log('\n📋 [테스트 10] 완료된 항목 일괄 삭제');
  await page.click('#clearBtn');

  const count6 = await page.locator('#list li').count();
  assert(count6 === 1, '완료 항목 일괄 삭제 후 1개 남음');

  const remainingAfterClear = await page.locator('#list li .item-text').first().textContent();
  assert(remainingAfterClear === '빵', '"빵"만 남아야 함 (체크 안 됨)');

  console.log('\n📋 [테스트 11] localStorage 영속성');
  await addItem(page, '사과');
  await addItem(page, '오렌지');
  await page.reload();

  const countAfterReload = await page.locator('#list li').count();
  assert(countAfterReload === 3, '새로고침 후 아이템(빵, 사과, 오렌지) 유지됨');

  const textsAfterReload = await page.locator('#list li .item-text').allTextContents();
  assert(textsAfterReload.includes('빵'), '새로고침 후 "빵" 유지됨');
  assert(textsAfterReload.includes('사과'), '새로고침 후 "사과" 유지됨');
  assert(textsAfterReload.includes('오렌지'), '새로고침 후 "오렌지" 유지됨');

  console.log('\n📋 [테스트 12] 마지막 아이템 삭제 후 빈 상태');
  while (await page.locator('#list li').count() > 0) {
    await page.locator('#list li .delete-btn').first().click();
  }
  const emptyVisible = await page.locator('#empty').isVisible();
  assert(emptyVisible, '모든 아이템 삭제 후 빈 상태 메시지 다시 표시됨');

  console.log('\n');
  console.log('═'.repeat(50));
  console.log(`📊 테스트 결과: ${passed + failed}개 중 ${passed}개 통과, ${failed}개 실패`);
  console.log('═'.repeat(50));

  if (failed === 0) {
    console.log('🎉 모든 테스트를 통과했습니다!');
  } else {
    console.log('⚠️  일부 테스트가 실패했습니다. 위 내용을 확인해주세요.');
  }

  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();