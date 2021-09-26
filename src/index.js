const axios = require('axios').default;
const https = require('https');
const range = require("range");
const moment = require("moment");
const nodemailer = require('nodemailer');
const SMTP_CONFIG = require('./config/smtp');
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

let range28 = range.range(1, 29);
let range30 = range.range(1, 31);
let range31 = range.range(1, 32);
let years = {
    "2021": {
        "9": {
            name: "Septiembre",
            days: range30
        },
        "10": {
            name: "Octubre",
            days: range31
        },
        "11": {
            name: "Noviembre",
            days: range30
        },
        "12": {
            name: "Diciembre",
            days: range31
        },        
    },
    "2022": {
        "1": {
            name: "Enero",
            days: range31
        },
        "2": {
            name: "Febrero",
            days: range28
        },
        "3": {
            name: "Marzo",
            days: range31
        },
        "4": {
            name: "Abril",
            days: range30
        },        
        "5": {
            name: "Mayo",
            days: range31
        },
        "6": {
            name: "Junio",
            days: range30
        },
        "7": {
            name: "Julio",
            days: range31
        },
        "8": {
            name: "Agosto",
            days: range31
        },        
        "9": {
            name: "Septiembre",
            days: range30
        },
        "10": {
            name: "Octubre",
            days: range31
        },
        "11":{
            name: "Noviembre",
            days: range30
        },
        "12": {
            name: "Diciembre",
            days: range31
        },
    }
}


//evitamos la validacion de SSL certificate
let httpsAgent = new https.Agent({  
    rejectUnauthorized: false
});

let getUrl = (month,year) => {
    return `https://servicos.dpf.gov.br/agenda-publico-rest/api/data-bloqueada/mes-ano/${month}/${year}/5820/11/1`;
}

let getBlockedDays = async (year,month) => {    
    //consultamos el endpoint
    let response = await axios.get(
        getUrl(month,year),
        {httpsAgent}
    )
    //console.log(response.data);
    return response.data
}

let getFreeDays = async (year,month) => {
    let monthObject = years[year][month]
    let monthDays = monthObject.days;
    let blockedDays = monthDays
    let requestSuccess = false
    while(!requestSuccess){
        try{
            blockedDays = await getBlockedDays(year,month);
            console.log(`Consultando ${monthObject.name} de ${year}: `);
            requestSuccess = true
        }catch(err) {
            console.error(`Error al consultar ${monthObject.name} de ${year}: ${err.response.statusText} code ${err.response.status}`);
            requestSuccess = false
        }
    }
    let freeDays = monthDays.filter(day => !blockedDays.includes(day))
    console.log(freeDays);
    return freeDays;
}

let sendEmail = async (allFreeDays) => {
    let textToSend = ""
    allFreeDays.forEach(({year,month,freeDays}) => {
        textToSend = textToSend + `Hay una cita disponible los dias ${freeDays} de ${month.name} del ${year}.\n`;
    });
    console.log("dias libres : ",allFreeDays);
    console.log("texto a enviar: ",textToSend);
    const transporter = nodemailer.createTransport({
        host: SMTP_CONFIG.host,
        port: SMTP_CONFIG.port,
        auth: {
            user: SMTP_CONFIG.user,
            pass: SMTP_CONFIG.pass
        },
        tls: {
            rejectUnauthorized: false
        }
    })

    try{
        const mailsent = await transporter.sendMail({
            text: textToSend,
            subject: "Dias libres para agendamiento",
            from: "Luis Garcia <ldgl1215@gmail.com>",
            to:"ldgl1215@gmail.com"
        })
        console.log("informacion de correo enviado: ", mailsent);
    }catch(err){
        console.error("error al enviar el correo: ",err);
    }



}

let initProcess = async () =>{
    let allFreeDays = []
    freeDaysBoolean = false
    for(const year in years){
        for(const month in years[year]){
            let freeDays = await getFreeDays(year,month)
            //test data
            // if(month == 12 && year == 2021){
            //     freeDays = [10,12,15]
            // }
            if(freeDays.length > 0){
                allFreeDays.push({
                    year,
                    month: years[year][month],
                    freeDays
                })
                freeDaysBoolean = true
            }
            await sleep(500)
        }
    }
    if(freeDaysBoolean) {
        await sendEmail(allFreeDays);
    }
}
let main = async () => {
    while(true){
        await initProcess()
        let now = moment()
        console.log("Busqueda finalizada: ",now.format("LLL"));
        await sleep(120 * 1000) //esperar por 2 minutos para volver a consultar            
    }
}

main()


