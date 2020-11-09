const puppeteer = require('puppeteer');
const config = require('../config.json');

const mapUrl = 'http://portal.chmi.cz/files/portal/docs/poboc/OS/OMK/mapy/prohlizec.html?map=T1H';
const picReq = 'http://portal.chmi.cz/files/portal/docs/poboc/OS/OMK/mapy';
const picPath = '/home/pavel/javascript/puppeteer/weather/pics/';
const date = new Date();
const dd = String(date.getDate()).padStart(2, '0'); // current day as dd
const allowedHours = [
    "00:00", "01:00", "02:00", "03:00", "04:00",
    "05:00", "06:00", "07:00", "08:00", "09:00",
    "10:00", "11:00", "12:00", "13:00", "14:00",
    "15:00", "16:00", "17:00", "18:00", "19:00",
    "20:00", "20:00", "21:00", "22:00", "23:00"
];
const elements = {
    dateSelect: '#seznam',
    dateOption: '#seznam > option',
    submitDates: '#nahrat'
};


// ============================================================================

let hour = process.argv[2];

// only hours, not minutes
if (hour !== "current" && !allowedHours.includes(hour)) {
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
    page.goto(mapUrl);
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
        page.waitForSelector('#map_image'),
        page.waitForResponse(picReq + resource),
        page.waitForFunction(
            'document.querySelector("#nahrano").innerText === "(1 / 1)"'
        )
    ]);

    // take screenshot
    await page.screenshot({
        path: picPath + 'temperatures.png',
        fullPage: true
    });
    await browser.close();
})();