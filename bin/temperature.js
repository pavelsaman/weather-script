const puppeteer = require('puppeteer');
const config = require('../config.json');


const date = new Date();
const dd = String(date.getDate()).padStart(2, '0'); // current day as dd
const elements = {
    dateSelect: '#seznam',
    dateOption: '#seznam > option',
    submitDates: '#nahrat',
    map: '#map_image',
    loader: '#nahrano'
};

// ============================================================================

let hour = process.argv[2];

// only hours, not minutes
if (hour !== "current" && !config.allowedHours.includes(hour)) {
    console.error("Not allowed time!");
    process.exit(1);
}

if (hour === "current") {
    hour = (date.getHours() - 1).toString() + ":00";
}

// only past hours
if ((date.getHours() - 1) < hour.split(':')[0]) {
    console.error("Time in the future, no data!");
    process.exit(1);
}

const regexStr = '[;]{1}' + dd + '[.]{1}.*' + hour + '$';

(async () => {
    // go to the weather site
    const browser = await puppeteer.launch(config.browserOptions);
    const page = await browser.newPage();
    
    await page.goto(config.mapUrl);
    await page.waitForNavigation();       
    
    // get option values based on regexStr
    let options = await page.$$eval(elements.dateOption,
        (options, regexStr) => {            
            let vals = options.map(option => {
                return option.getAttribute('value');
            });
            
            return vals.filter(val => { 
                return val.match(new RegExp(regexStr));        
            });   
        }, regexStr
    );
    
    // select options
    await page.select('select' + elements.dateSelect, ...options);
    await page.click(elements.submitDates);
    
    // wait for the pic to show up
    let resource = options[0].split(';')[0];
    resource = resource.substr(1, resource.length);
    await Promise.all([
        page.waitForSelector(elements.map),
        page.waitForResponse(config.picReq + resource),
        page.waitForFunction(
            'document.querySelector("' + elements.loader
                + '").innerText === "(1 / 1)"'
        )
    ]);

    // take screenshot
    await page.screenshot({
        path: config.picDir + 'temperatures.png',
        fullPage: true
    });
    await browser.close();
})();