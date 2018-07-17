# Community updates, 2018-07-17

1. New conference in town: NG-DE 2019, summer 2019 in Berlin, by Symetics GmbH, see https://ng-de.org 
1. Angular Days 2018, 09.-12. October in Berlin, by S&S Media see https://javascript-days.de/angular
1. Web Developer Conference (WDC), 16.-18. October 2018 in Munich, by Neue Mediengesellschaft Ulm mbH see https://www.web-developer-conference.de/
1. ⭐️ AngularConnect, 6. &. 7 November 2018 in London, see https://angularconnect.com/
1. Angular.Schule 3+1 days advanced workshop, 18.-21. September 2018 in Heidelberg, see https://angular.schule/schulungen/heidelberg 
1. Angular 6.1.0-rc.0 is out, see https://github.com/angular/angular/blob/master/CHANGELOG.md#610-rc0-2018-07-11
   Notable changes since 6.0
   - mainly bugfixes
   - async/await with Jasmine
   - support for ShadowDOM v1 (ViewEncapsulation.Shadow) - This should eventually deprecate the ViewEncapsulation.Native option.
   - typescript 2.9 support
   - KeyValuePipe
   - new (still experimental) ivy features
1. TypeScript 3.0 is out
   - not supported by Angular right now!
   - Tuples in rest parameters and spread expressions (`declare function foo(...args: [number, string, boolean]): void;`)
   - New `unknown` top type (a type-safe counterpart of `any`)
   - only a few minor breaking change
1. Did you installed a fresh version of Angular-CLI/Webpack on 12th. of July 2018? --> __eslint-scope Security Incident__, see https://nodesource.com/blog/a-high-level-post-mortem-of-the-eslint-scope-security-incident/
   (check if you do not have `eslint-scope@3.7.1` and `eslint-config-eslint@5.0.2`) -- 2FA for your npm accounts!
   
   You can run this, Look for "3.7.2" in the output :skull_and_crossbones:
   ```
   cd ~/code
   find . -type d -name "eslint-scope" -print0 | xargs -n 1 -0 -I % sh -c "(cat %/package.json | npx json version) && echo '(at %)'"
   ```
