import { importRemote } from "../../dist/esm";
import { REMOTE_URL } from "../config";

importRemote({ url: REMOTE_URL, scope: "remote", module: "index" }).then(({ writeToElement }) => {
  const testId = "host-div";
  const hostDiv = document.createElement("div");
  hostDiv.setAttribute("data-testid", testId);
  document.body.appendChild(hostDiv);
  writeToElement(hostDiv, "It works!");
});
