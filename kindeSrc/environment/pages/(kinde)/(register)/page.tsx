"use server";

import {
  getKindeNonce,
  type KindePageEvent,
} from "@kinde/infrastructure";
import React from "react";
import { renderToString } from "react-dom/server.browser";
import { Widget } from "../../../../components/widget";
import { DefaultLayout } from "../../../../layouts/default";
import { Root } from "../../../../root";

const EMAIL_STORAGE_KEY = "kinde_prefill_email";

const DefaultPage: React.FC<KindePageEvent> = ({ context, request }) => {
  const nonce = getKindeNonce();

  return (
    <Root context={context} request={request}>
      <DefaultLayout isRegisterPage={true}>
        <Widget heading={context.widget.content.heading} />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var STORAGE_KEY = ${JSON.stringify(EMAIL_STORAGE_KEY)};
                var EMAIL_SELECTOR =
                  'input[name="p_email_username"], input[name="p_email"], #sign_up_sign_in_credentials_p_email_username, input[type="email"], input[name="email"]';
                var email = "";
                try { email = sessionStorage.getItem(STORAGE_KEY) || ""; } catch (e) {}
                if (!email) return;

                var filled = false;

                function fillEmail() {
                  if (filled) return;
                  var input = document.querySelector(EMAIL_SELECTOR);
                  if (!input) return;
                  var setter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype,
                    "value"
                  );
                  if (setter && setter.set) {
                    setter.set.call(input, email);
                  } else {
                    input.value = email;
                  }
                  input.dispatchEvent(new Event("input", { bubbles: true }));
                  input.dispatchEvent(new Event("change", { bubbles: true }));
                  filled = true;
                  try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
                  observer.disconnect();
                }

                var observer = new MutationObserver(fillEmail);
                observer.observe(document.body, { childList: true, subtree: true });
                fillEmail();

                // safety timeout: stop observing after 10s
                setTimeout(function () { try { observer.disconnect(); } catch (e) {} }, 10000);
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
