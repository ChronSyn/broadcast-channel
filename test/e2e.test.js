import {
    Selector
} from 'testcafe';
import AsyncTestUtil from 'async-test-util';

const BASE_PAGE = 'http://127.0.0.1:8080/';

fixture `Example page`
    .page `http://127.0.0.1:8080/`;


[
    'idb',
    'native',
    'default'
].forEach(methodType => {
    test.page(BASE_PAGE + '?methodType=' + methodType)('test with method: ' + methodType, async () => {
        console.log('##### START TEST WITH ' + methodType);
        const stateContainer = Selector('#state');

        await AsyncTestUtil.waitUntil(async () => {
            const value = await stateContainer.innerText;
            //       console.log(value);

            // const out = await t.getBrowserConsoleMessages();
            // console.log('out:');
            // console.log(JSON.stringify(out));

            return value === 'SUCCESS';
        });
    });
});
