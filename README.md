# ringcentral-voice-apis-demo
How to make new calls, handle incoming calls and control active calls within your application

## Create a RingCentral application
- [Login or create an account if you have not done so already.](https://developer.ringcentral.com/login.html#/)
- Go to Console/Apps and click 'Create App' button.
- Select "REST API App" under "What type of app are you creating?" Click 'Next'.
- Provide the app name and app description
- Under "Auth" select "Password-based auth flow."
- Under "Security" add the following permissions:
  * Call Control - Read Accounts - Read Call Log - Read Call Recording
- Under "Security" select "This app is private and will only be callable using credentials from the same RingCentral account."
- Click the 'Create' button.</li>

When you are done, you will be taken to the app's dashboard. Make note of the Client ID and Client Secret. We will be using those momentarily.

## Clone - Setup - Run the project
```
$ git clone https://github.com/paco-vu/ringcentral-voice-apis-demo

$ cd ringcentral-voice-apis-demo

$ npm install --save

$ cp dotenv .env
```

Specify the app and user credentials in the .env file accordingly
```
RINGCENTRAL_CLIENTID=Your-App-Client-Id-Sandbox
RINGCENTRAL_CLIENTSECRET=Your-App-Client-Secret-Sandbox
RINGCENTRAL_SERVER=https://platform.devtest.ringcentral.com

RINGCENTRAL_USERNAME=Your-Sandbox-Username
RINGCENTRAL_PASSWORD=Your-Sandbox-Password
RINGCENTRAL_EXTENSION=Your-Sandbox-User-Extension-Number

MY_RING_OUT_NUMBER=Choose-a-Phone-Number-For-Receiving-RingOut-Call
MY_DEVICE_ID=Your-Softphone-Device_Id

```

* To get a device Id, you can login the RingCentral soft-phone [Download from here. Look at the DEVELOPER SANDBOX TOOLS](https://community.ringcentral.com/spaces/144/index.html), then run the app and make a `call-out` call. Check the Terminal console to see which device is 'online' and grab the device id and put it in the .env file. Rerun the app.
* To create a demo customer and team phone numbers, open the 'customer-numbers.json' and the 'team-numbers.json' and provide valid phone numbers.


## Run the demo
```
$ node index.js
```
* Open your browser and enter the local address "locahost:5000"
* Make a call to one of the extension under your account
