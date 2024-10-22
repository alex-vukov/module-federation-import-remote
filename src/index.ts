const REMOTE_ENTRY_FILE = "remoteEntry.js";

type CustomEvent = Event | { type: string; target: HTMLScriptElement };
type EventHandler = (event: CustomEvent) => void;
const inProgress: Record<string, Array<EventHandler>> = {};
const dataPrefix = "host:";

// Ported from __webpack_require__.l
const injectScriptInHtml = (url: string, onDone: EventHandler, key: string) => {
  if (inProgress[url]) {
    inProgress[url].push(onDone);
    return;
  }

  const allScripts = document.getElementsByTagName("script");
  let script: HTMLScriptElement | undefined;

  for (let i = 0; i < allScripts.length; i++) {
    let currentScript = allScripts[i];
    if (currentScript.getAttribute("src") == url || currentScript.getAttribute("data-mfir") == dataPrefix + key) {
      script = currentScript;
      break;
    }
  }

  let shouldAttach = false;

  if (!script) {
    shouldAttach = true;
    script = document.createElement("script");

    script.setAttribute("data-mfir", dataPrefix + key);
    script.src = url;
  }
  inProgress[url] = [onDone];

  const onScriptComplete = (prev, event: CustomEvent) => {
    // avoid mem leaks in IE.
    script.onerror = script.onload = null;
    clearTimeout(timeout);
    const doneFns = inProgress[url];
    delete inProgress[url];
    script.parentNode?.removeChild(script);
    doneFns?.forEach((fn) => fn(event));
    if (prev) return prev(event);
  };
  const timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: "timeout", target: script }), 120000);
  script.onerror = onScriptComplete.bind(null, script.onerror) as OnErrorEventHandler;
  script.onload = onScriptComplete.bind(null, script.onload);
  if (shouldAttach) {
    document.head.appendChild(script);
  }
};

const loadRemote = (url: string, scope: string, bustRemoteEntryCache: boolean) =>
  new Promise<void>((resolve, reject) => {
    const timestamp = bustRemoteEntryCache ? `?t=${new Date().getTime()}` : "";
    injectScriptInHtml(
      `${url}${timestamp}`,
      (event) => {
        if (event?.type === "load") {
          // Script loaded successfully:
          return resolve();
        }
        const realSrc = (event?.target as HTMLScriptElement)?.src;
        const eventType = event?.type;
        const error = new Error();
        error.message = `Loading script failed.\nMissing: ${realSrc}\nEvent type: ${eventType}`;
        error.name = "ScriptExternalLoadError";
        reject(error);
      },
      scope,
    );
  });

const initSharing = async () => {
  if (!__webpack_share_scopes__?.default) {
    await __webpack_init_sharing__("default");
  }
};

// __initialized and __initializing flags prevent some concurrent re-initialization corner cases
const initContainer = async (containerScope: any) => {
  try {
    if (!containerScope.__initialized && !containerScope.__initializing) {
      containerScope.__initializing = true;
      await containerScope.init(__webpack_share_scopes__.default);
      containerScope.__initialized = true;
      delete containerScope.__initializing;
    }
  } catch (error) {
    console.error(error);
  }
};

export interface ImportRemoteOptions {
  url: string;
  scope: string;
  module: string;
  remoteEntryFileName?: string;
  bustRemoteEntryCache?: boolean;
}

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
    // Load the remote and initialize the share scope if it's empty
    await Promise.all([loadRemote(`${url}/${remoteEntryFileName}`, scope, bustRemoteEntryCache), initSharing()]);
    if (!window[scope]) {
      throw new Error(
        `Remote loaded successfully but ${scope} could not be found! Verify that the name is correct in the Webpack configuration!`,
      );
    }
    // Initialize the container to get shared modules and get the module factory:
    const [, moduleFactory] = await Promise.all([
      initContainer(window[scope]),
      window[scope].get(module.startsWith("./") ? module : `./${module}`),
    ]);
    return moduleFactory();
  } else {
    const moduleFactory = await window[scope].get(module.startsWith("./") ? module : `./${module}`);
    return moduleFactory();
  }
};
