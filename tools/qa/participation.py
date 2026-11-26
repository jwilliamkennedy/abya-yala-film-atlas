"""Exercise request handling without sending any real request to the Atlas."""
import asyncio
import json
from urllib.parse import urlencode
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch()
        page=await browser.new_page(accept_downloads=True)
        submissions=[]
        async def mock(route):
            submissions.append(route.request.post_data_json)
            await route.fulfill(json={'success':'true','message':'Mock acceptance'})
        await page.route('https://formsubmit.co/**', mock)
        q=urlencode({'about':'Test film — Test director','maker':'DIR-0001','film':'FILM-0001','land':'LAND-123','kind':'geographic visibility','page':'http://127.0.0.1:8985/beta/maker/DIR-0001.html#FILM-0001'})
        await page.goto('http://127.0.0.1:8985/beta/corrections.html?'+q)
        assert await page.locator('#maker').input_value()=='DIR-0001'
        assert await page.locator('#film').input_value()=='FILM-0001'
        assert await page.locator('#visibility-field').is_visible()
        await page.locator('#visibility').select_option(label='Catalogue listing without map placement')
        await page.locator('#what').fill('Synthetic test request; never submitted to the real service.')
        async with page.expect_download() as download:
            await page.locator('#download').click()
        assert (await download.value).suggested_filename=='atlas-request.txt'
        assert not submissions
        await page.locator('#send').click()
        await page.wait_for_function("document.querySelector('#copied').textContent.includes('accepted your request')")
        assert submissions[0]['film_id']=='FILM-0001'
        assert submissions[0]['requested_visibility']=='Catalogue listing without map placement'
        assert not submissions[0]['reply_email']
        await page.locator('#kind').select_option(label='Remove or withdraw a record')
        assert await page.locator('#visibility').is_disabled()
        await page.goto('http://127.0.0.1:8985/beta/corrections.html?maker=%3Cscript%3E&page=https%3A%2F%2Fexample.com')
        assert not await page.locator('#maker').input_value()
        assert not await page.locator('#page').input_value()
        await browser.close()
        print('Participation: exact context, visibility choices, local copy and mocked delivery verified')

if __name__=='__main__':
    asyncio.run(main())
