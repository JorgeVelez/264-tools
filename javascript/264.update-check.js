/*
  264.update-check.js
*/

autowatch = 1;

// initialise Mgraphics
initialiseMgraphics();
// create object holding all the relevant module variables
var MPU264 = new mpuDOM();
// post package details to Max window on startup
postPackageDetails(MPU264.localPackageInfo);

/**
* loadbang()
* Default function Max will fire on patch load
*
*/
function loadbang() {
  // Check for updates automatically on patch load
  checkForUpdates(MPU264);
}

/**
* postPackageDetails(lPinfo)
* posts the package’s name, version, author information, and local path
* to the Max window
*
* arguments:
* lPinfo            = (object)  localPackageInfo object
*
* usage:
* var lpi = new localPackageInfo();
* postPackageDetails(lpi);
* => [posts the following to the Max window]
*    package name, vX.X.X
*    author field
*    local/path/to/package
*
*/
function postPackageDetails(lPinfo) {
  post("\n" + lPinfo.name + ", v" + lPinfo.version);
  post("\n     ", lPinfo.author, "\n");
  post("\n     ", lPinfo.dir, "\n");
}

/**
* checkForUpdates(mpu)
* retrieve remote package-info.json from server, validate & compare versions, switch
* to new button state if check fails, an update is available, or the local
* version is already up-to-date
*
* arguments:
* mpu               = (object)  object as generated by mpuDOM()
*
*/
function checkForUpdates(mpu) {
  // update button state to ‘Checking for updates…’
  mpu.button.instances.current = mpu.button.instances.checkingForUpdates;
  // request remote package information
  requestRemotePackage(mpu, function () {
    // try to convert server response into package info object
    mpu.remotePackageInfo = new remotePackageInfo(mpu.request.response);
    // validate remote package-info.json against local copy (names must match,
    // and remote package-info.json must contain a version field)
    if (validateRemotePackageInfo(mpu.localPackageInfo, mpu.remotePackageInfo)) {
      // compare versions (or pass function)
      if (isUpdateAvailable(mpu.localPackageInfo, mpu.remotePackageInfo)) {
        // update button state to ‘Install update’
        mpu.button.instances.current = mpu.button.instances.downloadUpdate;
        post("An update to v" + mpu.remotePackageInfo.version + " is available!\n");
      } else {
        // update button state to ‘Your package is up-to-date!’
        mpu.button.instances.current = mpu.button.instances.checkUpToDate;
        post("Your package is up-to-date.\n");
      }
    } else {
      // update button state to ‘Couldn’t check for updates… Try again?’
      mpu.button.instances.current = mpu.button.instances.checkFailed;
      error("Error: failed to retrieve remote package-info.json...\n");
    }
    mgraphics.redraw();
  });
}

/**
* downloadUpdate(mpu)
* Open release page on GitHub to allow update download.
*
*/
function downloadUpdate(mpu) {
  post("Opening latest update in web browser...\n");
  max.launchbrowser(mpu.remotePackageInfo.releaseURL);
}

/**
* mpuDOM()
* create an instance of the Max Package Updater Data Object Model
*
* usage:
* var mpuDOM = new mpuDOM();
* mpuDOM.margins.x;
* => 30;
*
*/
function mpuDOM() {
  this.margins = {
    x:        30,
    y:        20
  };
  this.colors = {
    bg:       [1.,    1.,    1.,    1.],
    reverse:  [1.,    1.,    1.,    1.],
    text:     [0.15,  0.15,  0.15,  1.],
    success:  [0.54,  0.75,  0.38,  1.],
    info:     [0.33,  0.54,  0.73,  1.],
    neutral:  [0.88,  0.88,  0.88,  1.],
    danger:   [0.82,  0.41,  0.42,  1.]
  };
  this.fontFamily = {
    light:    "Lato Regular",
    regular:  "Lato Semibold",
    bold:     "Lato Heavy"
  };
  this.fontSizes = {
    h1:       "28",
    h2:       "15",
    p:        "14"
  };
  this.button = new Button([this.margins.x, 150, 285, 45], this);
  this.localPackageInfo = new localPackageInfo();
}

/**
* initialiseMgraphics()
* run the initialisation steps required to get
* the Mgraphics system up and running
*
*/
function initialiseMgraphics() {
  mgraphics.init();
  mgraphics.relative_coords = 0;
  mgraphics.autofill = 0;
}

function paint() {
  // draw package name heading
  drawH1(MPU264.localPackageInfo.name ? MPU264.localPackageInfo.name : "<unknown>", [0, 0]);
  // draw "local version" subheading
  drawH2("local version", [0, 60]);
  // draw local version number
  drawP(MPU264.localPackageInfo.version ? MPU264.localPackageInfo.version : "<unknown>", [0, 90]);
  // draw remote version number, if known
  if (MPU264.remotePackageInfo && MPU264.remotePackageInfo.version) {
    drawH2("remote version", [155, 60]);
    drawP(MPU264.remotePackageInfo.version, [155, 90]);
  }
  // draw button
  drawButton(MPU264.button);
}

function drawH1(text, pos) {
  drawText(text, pos, MPU264.fontFamily.bold, MPU264.fontSizes.h1, MPU264.colors.text);
}

function drawH2(text, pos) {
  drawText(text, pos, MPU264.fontFamily.light, MPU264.fontSizes.h2, MPU264.colors.info);
}

function drawP(text, pos) {
  drawText(text, pos, MPU264.fontFamily.regular, MPU264.fontSizes.p, MPU264.colors.text);
}

function drawText(text, pos, font, size, color) {
  mgraphics.select_font_face(font);
  mgraphics.set_font_size(size);
  mgraphics.move_to(MPU264.margins.x + pos[0], MPU264.margins.y + pos[1] + mgraphics.font_extents()[0]);
  mgraphics.set_source_rgba(color);
  mgraphics.text_path(text);
  mgraphics.fill();
}

/**
* drawButton(btn)
* paint the call-to-action button using Mgraphics from a
* button object generated using Button()
*
* arguments:
* btn               = (object)  button object generated with Button()
*
* usage:
* myButton = new Button([20, 150, 285, 45]);
* drawButton(myButton);
* => renders the button in its current state in the JSUI object
*
*/
function drawButton(btn) {
  // Move text down 1 pixel and lighten background colour on mouse hover
  var textOffset;
  if (btn.state === 1) {
    btn.instances.current.background[3] = 0.8;
    textOffset = 1;
  } else {
    btn.instances.current.background[3] = 1.;
    textOffset = 0;
  }
  // Draw button rectangle
  mgraphics.set_source_rgba(btn.instances.current.background);
  mgraphics.rectangle(btn.rect);
  mgraphics.fill();
  // Draw button text
  mgraphics.select_font_face(MPU264.fontFamily.bold);
  mgraphics.set_font_size(MPU264.fontSizes.p);
  // Calculate text position
  var Xcoord = MPU264.margins.x + (btn.rect[2] / 2) - (mgraphics.text_measure(btn.instances.current.text)[0] / 2);
  var Ycoord = MPU264.margins.y + btn.rect[1] + (mgraphics.font_extents()[0] / 2) + textOffset;
  mgraphics.move_to(Xcoord, Ycoord);
  mgraphics.set_source_rgba(btn.instances.current.color);
  mgraphics.text_path(btn.instances.current.text);
  mgraphics.fill();
}

/**
* Button(rect, [currentInstance])
* returns a javascript object with properties that define the main
* call-to-action button
*
* arguments:
* rect              = (array)   [x, y, width, height] defining button rectangle
* mpu               = (object)  mpuDOM() which provides colour variables
* currentInstance   = (string)  member of this.instances that is active (optional)
*
* usage:
* button = new Button([20, 150, 285, 45], myMPU264DOM);
* button => {
*   rect: [20, 150, 285, 45],
*   state: 0,
*   instances: {
*     // series of instances created using buttonInstance()
*     ...
*     // `instances.current` is set to `instances.checkForUpdates` by default.
*     current: {
*       text: "Check for updates",
*       color: [1, 1, 1, 1],
*       background: [0.33,  0.54,  0.73,  1.],
*       action: checkForUpdates,
*       enabled: true
*     }
*   }
* }
*
*/
function Button(rect, mpu, currentInstance) {
  this.rect = rect;
  this.state = 0;
  this.instances = new Object();
  this.instances.checkForUpdates = new buttonInstance(
    "Check for updates",
    mpu.colors.reverse,
    mpu.colors.info,
    checkForUpdates
  );
  this.instances.checkingForUpdates = new buttonInstance(
    "Checking for updates...",
    mpu.colors.text,
    mpu.colors.neutral
  );
  this.instances.checkUpToDate = new buttonInstance(
    "Your package is up to date!",
    mpu.colors.text,
    mpu.colors.neutral
  );
  this.instances.checkFailed = new buttonInstance(
    "Couldn’t check for updates… Try again?",
    mpu.colors.reverse,
    mpu.colors.danger,
    checkForUpdates
  );
  this.instances.downloadUpdate = new buttonInstance(
    "Download update",
    mpu.colors.reverse,
    mpu.colors.success,
    downloadUpdate
  );
  this.instances.installingUpdate = new buttonInstance(
    "Installing update...",
    mpu.colors.text,
    mpu.colors.neutral
  );
  this.instances.installSucceeded = new buttonInstance(
    "Update installed!",
    mpu.colors.text,
    mpu.colors.neutral
  );
  this.instances.installFailed = new buttonInstance(
    "Update installation failed…",
    mpu.colors.reverse,
    mpu.colors.danger
  );
  if (currentInstance && this.instances[currentInstance]) {
    this.instances.current = this.instances[currentInstance];
  } else {
    this.instances.current = this.instances.checkForUpdates;
  }
}

/**
* buttonInstance(text, color, background, [action])
* returns a javascript object with properties that define an instance
* of the main call-to-action button
*
* arguments:
* text              = (string)    text to be displayed on the button
* color             = (array)     RGBA colour definition for button text
* background        = (array)     RGBA colour definition for button background
* action [optional] = (function)  function that is called on click
*
* usage:
* myButton = new buttonInstance("I’m a button!", [0, 0, 0, 1], [0.5, 1, 0.5, 1], clickFunction);
* myButton => {
*   text: "I’m a button!",
*   color: [0, 0, 0, 1],
*   background: [0.5, 1, 0.5, 1],
*   action: clickFunction,
*   enabled: true
* }
*
* The `enabled` property is set to true if an `action` is provided, false if not.
*
*/
function buttonInstance(text, color, background, action) {
  this.text = text;
  this.color = color;
  this.background = background;
  if (action) {
    this.action = action;
    this.enabled = true;
  } else {
    this.enabled = false;
  }
}

/**
* isOnButton(x, y, btn)
* returns true if point [x, y] is within the bounds of the Button() provided
* as the the third argument (specifically reads from btn.rect)
*
* arguments:
* x                 = (number)    X co-ordinate of point to test
* y                 = (number)    Y co-ordinate of point to test
* btn               = (object)    button object as created by Button()
*
* usage:
* isOnButton(10, 10, Button([0, 0, 245, 45]));
* => true
* isOnButton(300, 300, Button([0, 0, 245, 45]));
* => false
*
*/
function isOnButton(x, y, btn) {
  var inXBounds = (x >= btn.rect[0]) && (x <= btn.rect[0] + btn.rect[2]);
  var inYBounds = (y >= btn.rect[1]) && (y <= btn.rect[1] + btn.rect[3]);
  return inXBounds && inYBounds;
}

/**
* JSUI MOUSE INTERACTION EVENTS
*
* onidle(), onclick(), ondrag()
* handle interaction with the call-to-action button.
*
*/
function onidle(x, y) {
  var onButton = isOnButton(x, y, MPU264.button);
  if (onButton && MPU264.button.state !== 1 && MPU264.button.instances.current.enabled) {
    // when mouse first hovers over button
    MPU264.button.state = 1;
    mgraphics.redraw();
  } else if (!onButton && MPU264.button.state !== 0) {
    // when mouse first leaves button
    MPU264.button.state = 0;
    mgraphics.redraw();
  }
}
function onclick(x, y) {
  if (isOnButton(x, y, MPU264.button) && MPU264.button.state !== 2 && MPU264.button.instances.current.enabled) {
    // when mouse first clicks on button
    MPU264.button.state = 2;
    if (MPU264.button.instances.current.action) {
      MPU264.button.instances.current.action(MPU264);
    }
    mgraphics.redraw();
  } else if (MPU264.button.state !== 0) {
    // when click is not on the button
    MPU264.button.state = 0;
    mgraphics.redraw();
  }
}
function ondrag(x, y, click) {
  if (isOnButton(x, y, MPU264.button) && click === 1 && MPU264.button.state !== 2 && MPU264.button.instances.current.enabled) {
    // when mouse first clicks on button
    MPU264.button.state = 2;
    mgraphics.redraw();
  } else if (click === 0 && MPU264.button.state !== 0) {
    // when mouse finishes clicking (on mouse up)
    MPU264.button.state = 0;
    mgraphics.redraw();
  }
}

/**
* validateRemotePackageInfo(localPackageInfo, remotePackageInfo)
* returns true if remote package is defined, specifies the same name as the
* local package, and contains a version field
*
* arguments:
* localPackageInfo  = (object)  as returned by localPackageInfo()
* remotePackageInfo = (object)  as returned by remotePackageInfo(response)
*
* usage:
* if(validateRemotePackageInfo(localPackageInfo, remotePackageInfo)) {
*   // operate on valid package
* } else {
*   // throw invalid package error
* }
*
*/
function validateRemotePackageInfo(localPackageInfo, remotePackageInfo) {
  if (typeof remotePackageInfo === 'undefined' || remotePackageInfo === null) {
    error("Error: remote package undefined...\n");
    return false;
  } else if (remotePackageInfo.name !== localPackageInfo.name) {
    error("Error: the remote package’s name, ‘" + remotePackageInfo.name + "’, does not match the local package ‘" + localPackageInfo.name + "’...\n");
    return false;
  } else if (!remotePackageInfo.version) {
    error("Error: remote package-info.json doesn’t contain a version field...\n");
    return false;
  } else {
    return true;
  }
}

/**
* isUpdateAvailable(localPackageInfo, remotePackageInfo)
* returns true if remote package version is greater than that of local package
*
* arguments:
* localPackageInfo  = (object)  as returned by localPackageInfo()
* remotePackageInfo = (object)  as returned by remotePackageInfo(response)
*
* usage:
* if(isUpdateAvailable(localPackageInfo, remotePackageInfo)) {
*   // celebrate! an update is available
* }
*
*/
function isUpdateAvailable(localPackageInfo, remotePackageInfo) {
  var localVersion = new SemVer(localPackageInfo.version);
  var remoteVersion = new SemVer(remotePackageInfo.version);
  if (remoteVersion.major > localVersion.major) {
    return true;
  } else if (remoteVersion.major === localVersion.major && remoteVersion.minor > localVersion.minor) {
    return true;
  } else if (remoteVersion.major === localVersion.major && remoteVersion.minor === localVersion.minor && remoteVersion.patch > localVersion.patch) {
    return true;
  } else {
    return false;
  }
}

/**
* localPackageInfo()
* returns an object with information from local package-info.json
*
* usage:
* var o = new localPackageInfo();
*
* o.author   = (string)  author information from package-info.json
* o.dict     = (dict)    dictionary containing entire contents of package-info.json
* o.dir      = (string)  absolute path to local package directory
* o.name     = (string)  local package name
* o.version  = (string)  local package version
*
*/
function localPackageInfo() {
  // get path to this package
  var thisFileName = jsarguments[0];
  var thisFile = new File(thisFileName);
  var regex = /([^\/\\]*)$/i;
  var packageDir = thisFile.foldername.replace(regex, "");
  // load package-info.json to retrieve details
  var localPackageInfo = new Dict;
  localPackageInfo.import_json(packageDir + "package-info.json");
  // export package information as variables
  this.dir = packageDir;
  this.name = localPackageInfo.get("name");
  this.version = localPackageInfo.get("version");
  this.author = localPackageInfo.get("author");
  this.dict = localPackageInfo;
}

/**
* remotePackageInfo(response)
* returns an object with information from remote package-info.json
*
* arguments:
* response   = (object)  a response object handed off from requestRemotePackage()
*
* usage:
* var o = new remotePackageInfo(response);
*
* o.author   = (string)  author information from remote package-info.json
* o.dict     = (dict)    dictionary containing entire contents of remote package-info.json
* o.name     = (string)  remote package name
* o.version  = (string)  remote package version
*
*/
function remotePackageInfo(response) {
  // Make sure server responded with valid JSON
  try { JSON.parse(response); }
	catch (e) {
		error("Error: server response is not JSON...\n");
		return false;
	}
  // parse server response into dictionary
  var remotePackageInfo = new Dict;
  remotePackageInfo.parse(response);
  this.name = remotePackageInfo.get("name");
  this.version = remotePackageInfo.get("version");
  this.author = remotePackageInfo.get("author");
  this.dict = remotePackageInfo;
  this.releaseURL = getLatestReleaseURL(this);
}

/**
* requestRemotePackage(localPackageInfo, request, callback)
* request a remote package-info.json
*
* arguments:
* mpu               = (object)    full max-package-updater object, including
*                                 localPackageInfo, assigns request to object
* callback          = (function)  handle the server response
*
* usage:
* requestRemotePackage(MPU264, function() {
*   // handle response
* });
*
*/
function requestRemotePackage(mpu, callback) {
  // make sure a callback function is provided
  if (!callback || typeof callback !== "function") {
    error("Error: no callback function defined for requestRemotePackage()...\n");
    return false;
  }
  // figure out what URL to query based on local package-info.json
  var packageInfoURL = getPackageInfoURL(mpu.localPackageInfo);
  if (packageInfoURL) {
    // create new request object
    mpu.request = new XMLHttpRequest();
    // request the URL of the remote package-info.json
    mpu.request.open("GET", packageInfoURL);
    // set timeout in case request is taking too long
    mpu.request.timeout = 10000;
    // set callback function
    mpu.request.onreadystatechange = callback;
    // trigger request
    mpu.request.send();
  } else {
    return false;
  }
}

/**
* getPackageInfoURL(localPackageInfo)
* returns a string containing the URL to a remote package-info.json by parsing
* local package-info.json for “package-info” and “repository” fields
*
* arguments:
* localPackageInfo  = (object) as returned by localPackageInfo()
*
* usage:
* var localInfo = new localPackageInfo();
* var repoURL = getPackageInfoURL(localInfo);
* => https://raw.githubusercontent.com/username/reponame/master/package-info.json
*
* s          = (string)   URL of package-info.json resource
*            = (boolean)  false if synthesis not possible
*
*/
function getPackageInfoURL(localPackageInfo) {
  // retrieve data from local package-info.json
  var repositoryField = localPackageInfo.dict.get("repository");
  if (localPackageInfo.dict.get("config") && localPackageInfo.dict.get("config::mpu")) {
    var packageInfoField = localPackageInfo.dict.get("config::mpu::package-info");
  }
  // initialise variables
  var repositoryString = null;
  var packageInfoURL = null;

  if (packageInfoField) {
    // process "package-info" field in package-info.json
    if (typeof packageInfoField === "string") {
      // if "package-info" field is a string, use it as the remote package-info.json URL
      packageInfoURL = packageInfoField;
    } else {
      error("Error: package-info.json “package-info” field is not a string...\n");
      return false;
    }
  }
  else if (repositoryField) {
    // process "repository" field in package-info.json
    if (typeof repositoryField === "string") {
      // if "repository" field in package-info.json is a simple string
      repositoryString = repositoryField;
    } else if (repositoryField.get("url") && typeof repositoryField.get("url") === "string") {
      // if "repository" field is an object with a "url" property that is a string
      repositoryString = repositoryField.get("url");
    } else {
      // otherwise (for now) shrug and give up
      error("Error: package-info.json “repository” field is neither a string nor contains a url field...\n");
      return false;
    }
    // format URL from repository field content
    packageInfoURL = synthesisePackageInfoURL(repositoryString);
  }
  else {
    // if no "repository" field is found in package-info.json
    error("Error: package-info.json doesn’t contain a “repository” field...\n");
    return false;
  }

  if (packageInfoURL) {
    if (validateURL(packageInfoURL)) {
      // if the synthesised or retrieved URL is valid, return it
      return packageInfoURL;
    } else {
      // if packageInfoURL is not a valid URL, return false
      error("Error:", packageInfoURL, "is not a valid URL...\n");
      return false;
    }
  }
  else {
    error("Error: packageInfoURL is undefined...\n");
    return false;
  }
}

/**
* synthesisePackageInfoURL(repositoryString)
* returns a string containing the URL to a remote repository’s package-info.json
*
* arguments:
* repositoryString  = (string)  can be shorthand, e.g. “username/reponame”,
*                               or longer git URL, e.g.
*                               “https://github.com/username/reponame.git”
*
* usage:
* var myRepo = 'username/reponame';
* var s = synthesisePackageInfoURL(myRepo);
* => https://raw.githubusercontent.com/username/reponame/master/package-info.json
*
* s          = (string)   URL of package-info.json resource
*            = (boolean)  false if synthesis not possible
*
*/
function synthesisePackageInfoURL(repositoryString) {
  if (typeof repositoryString !== "string" || repositoryString === null) {
    error("Error: formatRepositoryString() expects argument to be of type string...");
    return false;
  }
  // patterns to match
  var gitRepoRegX = new RegExp("^([A-Z0-9\-_]+)\/([A-Z0-9\-_]+)$", "i");
  var gitURLRegX = new RegExp("^(?:(?:git\\+)?https?:\/\/(?:www\.)?github\.com\/([A-Z0-9\-_]+\/[A-Z0-9\-_]+)(?:\/|.git)?)$", "i");
  // variable to hold username/repository slug
  var repoSlug = null;

  if (gitRepoRegX.test(repositoryString)) {
    // if string is in "username/repository" GitHub format
    repoSlug = repositoryString;
  } else if (gitURLRegX.test(repositoryString)) {
    // if string is a GitHub URL from which we can retrieve a "username/repository" slug
    repoSlug = repositoryString.match(gitURLRegX)[1];
  } else {
    // (for now) if neither a github.com URL nor repository slug, throw error
    error("Error: package-info.json “repository” field could not be parsed...\n");
    return false;
  }

  var gitHubURL = "https://raw.githubusercontent.com/" + repoSlug + "/master/package-info.json";
  return gitHubURL;
}

/**
* getLatestReleaseURL(packageInfo)
* returns a string containing the URL to a remote latest release by parsing
* local package-info.json “repository” field
*
* arguments:
* packageInfo       = (object) as returned by localPackageInfo() or remotePackageInfo()
*
* usage:
* var localInfo = new localPackageInfo();
* var releaseURL = getLatestReleaseURL(localInfo);
* => https://github.com/username/reponame/releases/latest
*
* s          = (string)   URL of package-info.json resource
*            = (boolean)  false if synthesis not possible
*
*/
function getLatestReleaseURL(packageInfo) {
  // retrieve data from local package-info.json
  var repositoryField = packageInfo.dict.get("repository");
  // initialise variables
  var repositoryString, latestReleaseURL;

  if (repositoryField) {
    // process "repository" field in package-info.json
    if (typeof repositoryField === "string") {
      // if "repository" field in package-info.json is a simple string
      repositoryString = repositoryField;
    } else if (repositoryField.get("url") && typeof repositoryField.get("url") === "string") {
      // if "repository" field is an object with a "url" property that is a string
      repositoryString = repositoryField.get("url");
    } else {
      // otherwise (for now) shrug and give up
      error("Error: package-info.json “repository” field is neither a string nor contains a url field...\n");
      return false;
    }
    // format URL from repository field content
    latestReleaseURL = synthesiseLatestReleaseURL(repositoryString);
  } else {
    // if no "repository" field is found in package-info.json
    error("Error: package-info.json doesn’t contain a “repository” field...\n");
    return false;
  }

  if (latestReleaseURL) {
    if (validateURL(latestReleaseURL)) {
      // if the synthesised or retrieved URL is valid, return it
      return latestReleaseURL;
    } else {
      // if latestReleaseURL is not a valid URL, return false
      error("Error:", latestReleaseURL, "is not a valid URL...\n");
      return false;
    }
  }
  else {
    error("Error: latestReleaseURL is undefined...\n");
    return false;
  }
}

/**
* synthesiseLatestReleaseURL(repositoryString)
* returns a string containing the URL to the latest remote release
*
* arguments:
* repositoryString  = (string)  can be shorthand, e.g. “username/reponame”,
*                               or longer git URL, e.g.
*                               “https://github.com/username/reponame.git”
*
* usage:
* var myRepo = 'username/reponame';
* var s = synthesisePackageInfoURL(myRepo);
* => https://github.com/username/reponame/releases/latest
*
* s          = (string)   URL of remote release resource
*            = (boolean)  false if synthesis not possible
*
*/
function synthesiseLatestReleaseURL(repositoryString) {
  if (typeof repositoryString !== "string" || repositoryString === null) {
    error("Error: synthesiseLatestReleaseURL() expects argument to be of type string...");
    return false;
  }
  // patterns to match
  var gitRepoRegX = new RegExp("^([A-Z0-9\-_]+)\/([A-Z0-9\-_]+)$", "i");
  var gitURLRegX = new RegExp("^(?:(?:git\\+)?https?:\/\/(?:www\.)?github\.com\/([A-Z0-9\-_]+\/[A-Z0-9\-_]+)(?:\/|.git)?)$", "i");
  // variable to hold username/repository slug
  var repoSlug = null;

  if (gitRepoRegX.test(repositoryString)) {
    // if string is in "username/repository" GitHub format
    repoSlug = repositoryString;
  } else if (gitURLRegX.test(repositoryString)) {
    // if string is a GitHub URL from which we can retrieve a "username/repository" slug
    repoSlug = repositoryString.match(gitURLRegX)[1];
  } else {
    // (for now) if neither a github.com URL nor repository slug, throw error
    error("Error: package-info.json “repository” field could not be parsed...\n");
    return false;
  }

  var gitHubURL = "https://github.com/" + repoSlug + "/releases/latest";
  return gitHubURL;
}

/**
* validateURL(url)
* returns true if provided string is a valid URL
*
* arguments:
* url        = (string)
*
* usage:
* var myURL = "https://bitly.com/";
* var b  = validateURL(myURL);
* => true
*
* b          = (boolean)  true if valid URL, otherwise false
*
*/
function validateURL(url) {
  if (typeof url !== "string" || url === null) {
    error("Error: validateURL() expects argument to be of type string...");
    return false;
  }
  // Regular Expression for URL validation by Diego Perini. License: MIT
  // https://gist.github.com/dperini/729294
  var urlRegX = new RegExp("^(?:(?:https?|ftp)://)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?$", "i");
  return urlRegX.test(url);
}

/**
* SemVer(version)
* returns an object with details of a semantic version number
*
* arguments:
* version     = (string)
*
* usage:
* var myPackageVersion = 'v0.7.9-beta';
* var sv = new SemVer(myPackageVersion);
*
* sv.version  = (string) '0.7.9'
* sv.major    = (number)  0
* sv.minor    = (number)  7
* sv.patch    = (number)  9
*
*/
function SemVer(version) {
  if (typeof version !== 'string') {
    error("Error: cleanSemVer() needs a string to operate on...\n");
    return false;
  }
  // match valid semantic version strings (based on the LOOSE regular expression in npm/node-semver)
  var semVerRegX = new RegExp("^[v=\\s]*([0-9]+)\\.([0-9]+)\\.([0-9]+)(?:-?((?:[0-9]+|\\d*[a-zA-Z-][a-zA-Z0-9-]*)(?:\\.(?:[0-9]+|\\d*[a-zA-Z-][a-zA-Z0-9-]*))*))?(?:\\+([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?$");
  // remove any surrounding whitespace from version string, and test against regular expression
  var v = version.trim().match(semVerRegX);
  if (!v) {
    console.error("Error: ‘" + v + "’ could not be parsed as a semantic version...\n");
    return false;
  }
  this.major = +v[1];
  this.minor = +v[2];
  this.patch = +v[3];
  this.version = this.major + '.' + this.minor + '.' + this.patch;
}