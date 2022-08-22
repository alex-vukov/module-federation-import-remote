/* eslint-disable no-undef */
import script from "scriptjs";

export interface ImportRemoteOptions {
  url: string;
  scope: string;
  module: string;
  remoteEntryFileName?: string | undefined;
  bustRemoteEntryCache?: boolean | undefined;
}

const REMOTE_ENTRY_FILE = "remoteEntry.js";

const loadEntryPoint = (
  url: ImportRemoteOptions["url"],
  bustRemoteEntryCache: ImportRemoteOptions["bustRemoteEntryCache"],
) =>
  new Promise<void>((resolve) => {
    script.urlArgs(bustRemoteEntryCache ? `t=${new Date().getTime()}` : null); // Add a timestamp to bust the cached remote entry file
    script(url, () => resolve());
  });

/* 
  Dynamically import a remote module using Webpack's loading mechanism:
  https://webpack.js.org/concepts/module-federation/
*/
export const importRemote = async ({
  url,
  scope,
  module,
  remoteEntryFileName = REMOTE_ENTRY_FILE,
  bustRemoteEntryCache = true,
}: ImportRemoteOptions) => {
  if (!window[scope]) {
    //Get the remote entry point:
    await loadEntryPoint(`${url}/${remoteEntryFileName}`, bustRemoteEntryCache);
    if (!window[scope]) {
      return Promise.reject(new Error(`${scope} could not be located!`));
    }
    // Initializes the share scope. This fills it with known provided modules from this build and all remotes
    await __webpack_init_sharing__("default");
    // Initialize the container, it may provide shared modules
    await window[scope].init(__webpack_share_scopes__.default);
  }

  const moduleFactory = await window[scope].get(module.startsWith("./") ? module : `./${module}`);
  return moduleFactory();
};
