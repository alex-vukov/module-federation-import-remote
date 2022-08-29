/* eslint-disable no-undef */
import script from "scriptjs";

export interface ImportRemoteOptions {
  url: string;
  scope: string;
  module: string;
  remoteEntryFileName?: string;
  bustRemoteEntryCache?: boolean;
}

const REMOTE_ENTRY_FILE = "remoteEntry.js";

const loadRemote = (
  url: ImportRemoteOptions["url"],
  scope: ImportRemoteOptions["scope"],
  bustRemoteEntryCache: ImportRemoteOptions["bustRemoteEntryCache"],
) =>
  new Promise((resolve, reject) => {
    const timestamp = bustRemoteEntryCache ? `?t=${new Date().getTime()}` : "";

    __webpack_require__.l(
      `${url}${timestamp}`,
      (event) => {
        if (typeof window[scope] !== "undefined") {
          return resolve(window[scope]);
        }
        const errorType = event?.type === "load" ? "missing" : event?.type;
        const realSrc = event?.target?.src;
        const error = new Error();
        error.message = "Loading script failed.\n(" + errorType + ": " + realSrc + ")";
        error.name = "ScriptExternalLoadError";
        reject(error);
      },
      scope,
    );
  });

/* 
  Dynamically import a remote module using Webpack's loading mechanism:
  https://webpack.js.org/concepts/module-federation/
*/
export const importRemote = async <T>({
  url,
  scope,
  module,
  remoteEntryFileName = REMOTE_ENTRY_FILE,
  bustRemoteEntryCache = true,
}: ImportRemoteOptions): Promise<T> => {
  if (!window[scope]) {
    try {
      // Load the remote:
      await loadRemote(`${url}/${remoteEntryFileName}`, scope, bustRemoteEntryCache);
      // Initializes the share scope. This fills it with known provided modules from this build and all remotes
      await __webpack_init_sharing__("default");
      // Initialize the container, it may provide shared modules:
      await window[scope].init(__webpack_share_scopes__.default);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  const moduleFactory = await window[scope].get(module.startsWith("./") ? module : `./${module}`);
  return moduleFactory();
};
