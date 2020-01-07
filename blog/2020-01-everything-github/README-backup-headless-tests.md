Modified & shortened version of https://github.com/angular/angular-cli/wiki/stories-continuous-integration
Just a backup, not used in the article right now.

----

# Continuous Integration

One of the best ways to keep your project bug free is through a test suite, but it's easy to forget
to run tests all the time.

Even though `ng test` and `ng e2e` already run on your environment, they need to be adjusted to run in CI environments.

## Updates for `ng test`

We'll use [Headless Chrome](https://developers.google.com/web/updates/2017/04/headless-chrome#cli) in CI environments.
In some environments we need to start the browser without sandboxing or disable the gpu.
Here we'll do both. 

In `karma.conf.js`, add a custom launcher called `ChromeHeadlessCI` below `browsers`:

```
browsers: ['Chrome'],
customLaunchers: {
  ChromeHeadlessCI: {
    base: 'ChromeHeadless',
    flags: ['--no-sandbox', '--disable-gpu']
  }
},
```

We'll override the `browsers` option from the command line to use our new configuration.
Now you can run the following command to use the new configurations:

```bash
ng test --watch=false --progress=false --browsers=ChromeHeadlessCI
```

## Updates for `ng e2e`

Create a new file in the `e2e` directory of your project called `protractor-ci.conf.js`, that extends
the original `protractor.conf.js`:

```ts
const config = require('./protractor.conf').config;

config.capabilities = {
  browserName: 'chrome',
  chromeOptions: {
    args: ['--headless', '--no-sandbox', '--disable-gpu']
  }
};

exports.config = config;
```

In CI environments it's a good idea to to use a specific version of [ChromeDriver](http://chromedriver.chromium.org/) instead of allowing `ng e2e` to use the latest one.
CI environments often use older versions of chrome, which are unsupported by newer versions of ChromeDriver.

An easy way to do this is to define a NPM script:

```
"webdriver-update-ci": "webdriver-manager update --standalone false --gecko false --versions.chrome 2.37"
```

And then on CI environments you call that script followed by the e2e command without updating webdriver.
This way you will always use a specific version of chrome driver between runs.


```bash
npm run webdriver-update-ci
ng e2e  --protractor-config=./e2e/protractor-ci.conf.js --webdriver-update=false
```
