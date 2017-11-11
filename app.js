const restify = require('restify');
const builder = require('botbuilder');
const QrCode = require('qrcode-reader');
const request = require('request');
const Jimp = require('jimp');

const HUB_URL = process.env.HUB_URL;
const LUIS_APP_URL = process.env.LUIS_APP_URL;

const qr = new QrCode();
qr.callback = (error, value) => {
  if (error) {
    console.log(error);
    return;
  }
  console.log(value.result);
  console.log(value);
};

const users = {
  hereItGoesTheUserId: {
    doctor: {
      ciscoSparkId: 'anId',
    },
    condition: 'flu',
    ciscoSparkId: 'anId',
  },
};

function getAssignedDoctorCiscoSparkId(userid) {
  return users[userid].doctor.ciscoSparkId;
}

function processQRCode(imageAsBinaryData) {
  Jimp.read(imageAsBinaryData, (err, image) => {
    if (err) {
      console.error(err);
      // TODO handle error
    }
    qr.decode(image.bitmap);
  });
}

function postMessage(address, message) {
  request({
    method: 'POST',
    url: HUB_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      address,
      message,
    },
    json: true,
  }, (error, response, body) => {
    console.log('Response received');
  });
}

// Setup Restify Server
// noinspection BadExpressionStatementJS
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
const connector = new builder.ChatConnector({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD,
});

// Listen for messages from users
server.post('/api/messages', connector.listen());

const onboardingDialog = [
  (session) => {
    session.preferredLocale('en');
    const message = 'Hi! Please type in the code present on your wristband';
    builder.Prompts.text(session, message);
    postMessage(session.message.address, message);
  },
  (session, results) => {
    session.beginDialog('mainDialog');
  }
];


/*
 Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
 noinspection JSCheckFunctionSignatures
*/
const bot = new builder.UniversalBot(connector);

bot.dialog('/', onboardingDialog);

bot.dialog('dailyMealInformation', [
  (session, results, next) => {
    let msg = 'Welcome to DailyMealInformation';
    postMessage(session.message.address, msg);
    session.send(msg);
  }
]);

bot.dialog('chatWithProfessional', [
  (session, results, next) => {
    let msg = 'Welcome to ChatWithProfessional';
    postMessage(session.message.address, msg);
    session.send(msg);
  }
]);

bot.dialog('videocallProfessional', [
  (session, results, next) => {
    let msg = 'Welcome to VideocallProfessional';
    postMessage(session.message.address, msg);
    session.send(msg);
  }
]);

let recognizer = new builder.LuisRecognizer({
  "en": LUIS_APP_URL
});

let luisDialog = new builder.IntentDialog({recognizers: [recognizer]})
.onBegin((session, results) => {
  const message = 'Alright! Thank you very much. By talking to me you can: \n - Ask to directly chat with your doctor. \n - Videocall your doctor. \n - Access your meal information. \n - Submit your requests. \n - Ask for a nurse to come';
  session.send(message);
  postMessage(session.message.address, message);
  let msg = 'Starting Intent Dialog';
  session.send(msg);
  postMessage(session.message.address, msg);
})
.onDefault([
  (session, results, next) => {
    let msg = 'Default dialog triggered';
    session.send(msg);
    postMessage(session.message.address, msg);
  }
]);

luisDialog.matches('AccessDailyMealInformation', 'dailyMealInformation');
luisDialog.matches('ChatWithProfessional', 'chatWithProfessional');
luisDialog.matches('videocallProfessional', 'VideocallProfessional');

bot.dialog('mainDialog', luisDialog);

const middleware = {
  botbuilder: [(session, next) => {
    if (session.message.text === 'clear') {
      session.endConversation();
    } else {
      next();
    }
  }],
};


bot.use(middleware);
