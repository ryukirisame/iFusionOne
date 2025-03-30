import FrameActionButtons from "./FrameActionButtons/FrameActionButtons";
import styles from "./Header.module.css";
import NavButtons from "./NavButtons/NavButtons";
import Tab from "./Tabs/Tab";

export default function Header() {
  return (
    <header className={styles["app-header"]}>
      
      <NavButtons />
      <FrameActionButtons />
    </header>
  );
}
