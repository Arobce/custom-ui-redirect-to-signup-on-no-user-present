"use server";

import { Widget } from "../../../../components/widget";
import {
  getKindeNonce,
  getKindeRegisterUrl,
  type KindePageEvent,
} from "@kinde/infrastructure";
import React from "react";
import { renderToString } from "react-dom/server.browser";
import { DefaultLayout } from "../../../../layouts/default";
import { Root } from "../../../../root";

const NO_ACCOUNT_ERROR_ID =
  "sign_up_sign_in_credentials_p_email_username_error_msg";
const NO_ACCOUNT_ERROR_TEXT_PATTERN = "No account found";

const DefaultPage: React.FC<KindePageEvent> = ({ context, request }) => {
  const nonce = getKindeNonce();
  const registerUrl = getKindeRegisterUrl();

  return (
    <Root context={context} request={request}>
      <DefaultLayout>
        <Widget heading={context.widget.content.heading} />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var registerUrl = "${registerUrl}";
                var errorId = ${JSON.stringify(NO_ACCOUNT_ERROR_ID)};
                var errorTextPattern = new RegExp(${JSON.stringify(NO_ACCOUNT_ERROR_TEXT_PATTERN)}, "i");
                var EMAIL_SELECTOR =
                  'input[name="p_email_username"], #sign_up_sign_in_credentials_p_email_username, input[type="email"], input[name="email"]';
                var redirected = false;
                var lastTypedEmail = "";

                function readEmailFromDom() {
                  var input = document.querySelector(EMAIL_SELECTOR);
                  return input && input.value ? input.value.trim() : "";
                }

                function cacheEmail() {
                  var v = readEmailFromDom();
                  if (v) lastTypedEmail = v;
                }

                // Event delegation survives form re-renders.
                document.addEventListener("input", function (e) {
                  var t = e.target;
                  if (t && t.matches && t.matches(EMAIL_SELECTOR)) cacheEmail();
                }, true);
                document.addEventListener("change", function (e) {
                  var t = e.target;
                  if (t && t.matches && t.matches(EMAIL_SELECTOR)) cacheEmail();
                }, true);
                document.addEventListener("submit", cacheEmail, true);

                function buildRegisterUrlWithHint(email) {
                  if (!email) return registerUrl;
                  try {
                    var url = new URL(registerUrl, window.location.origin);
                    url.searchParams.set("login_hint", email);
                    return url.toString();
                  } catch (e) {
                    var sep = registerUrl.indexOf("?") === -1 ? "?" : "&";
                    return registerUrl + sep + "login_hint=" + encodeURIComponent(email);
                  }
                }

                function checkForNoAccountError() {
                  if (redirected) return;
                  var el = document.getElementById(errorId);
                  var errorText = el && el.textContent ? el.textContent.trim() : "";
                  if (errorTextPattern.test(errorText)) {
                    redirected = true;
                    observer.disconnect();
                    var email = readEmailFromDom() || lastTypedEmail;
                    window.location.href = buildRegisterUrlWithHint(email);
                  }
                }

                var observer = new MutationObserver(checkForNoAccountError);
                observer.observe(document.body, {
                  childList: true,
                  subtree: true,
                  characterData: true,
                });
                cacheEmail();
                checkForNoAccountError();
              })();
            `,
          }}
        />
      </DefaultLayout>
    </Root>
  );
};

// Page Component
export default async function Page(event: KindePageEvent): Promise<string> {
  const page = await DefaultPage(event);
  return renderToString(page);
}
