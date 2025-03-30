import { VscChromeMinimize } from "react-icons/vsc";
import { VscChromeMaximize } from "react-icons/vsc";
import { VscChromeClose } from "react-icons/vsc";

import styles from "./FrameActionButtons.module.css";

export default function FrameActionButtons() {
  function sendFrameAction(action: FrameWindowAction) {
    return window.ifusion.frameActions.sendFrameAction(action);
  }

  return (
    <div className={styles[`frame-actions`]}>
      <button className={styles[`frame-action-btn`]} onClick={() => sendFrameAction("MINIMIZE")}>
        <VscChromeMinimize />
      </button>
      <button className={styles[`frame-action-btn`]} onClick={() => sendFrameAction("MAXIMIZE")}>
        <VscChromeMaximize />
      </button>
      <button className={styles[`frame-action-btn`]} onClick={() => sendFrameAction("CLOSE")}>
        <VscChromeClose id={styles['close-btn']}/>
      </button>
    </div>
  );
}
