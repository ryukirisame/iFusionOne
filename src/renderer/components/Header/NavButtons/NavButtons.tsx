import { VscHome } from "react-icons/vsc";
import styles from "./NavButtons.module.css";
import { VscAdd } from "react-icons/vsc";
import Tab from "../Tabs/Tab";
import { useState } from "react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  MouseSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { restrictToHorizontalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { useTabContext } from "../../../contexts/TabContext";

export default function NavButtons() {
  // const [tabs, setTabs] = useState<TabUIInfo[]>([]);
  // const [activeTabIndex, setActiveTabIndex] = useState<number>(-1);

  const { tabs, activeTabIndex, switchToTab, closeTab, reorderTab, hideAllTabs } = useTabContext();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Require the mouse to move by 10 pixels before activating
      activationConstraint: {
        distance: 10,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = tabs.findIndex((tab) => tab.id === active.id);
    const newIndex = tabs.findIndex((tab) => tab.id === over.id);
    if (oldIndex === newIndex) return;

    reorderTab(oldIndex, newIndex);

    // setTabs((prevTabs) => arrayMove(prevTabs, oldIndex, newIndex));
    // setActiveTabIndex(newIndex);

    // window.ifusion.tabs.reorderTab(oldIndex, newIndex);
  };

  // async function createNewTab(extensionUniqueId: string) {
  //   let response = await window.ifusion.tabs.createNewTab(extensionUniqueId);
  //   setActiveTabIndex(tabs.length);
  //   setTabs((prevTabs) => [...prevTabs, response.data!]);
  // }

  // async function switchToTab(tabId: string) {
  //   let response = await window.ifusion.tabs.switchToTab(tabId);

  //   setActiveTabIndex(response.data!.activeTabIndex);
  // }

  // async function closeHandler(tabId: string, event: React.MouseEvent) {
  //   let response = await window.ifusion.tabs.closeTab(tabId);

  //   setTabs((prevTabs) => {
  //     const updatedTabs = prevTabs.filter((tab) => tab.id !== tabId);

  //     return updatedTabs;
  //   });
  //   setActiveTabIndex(response.data!.activeTabIndex);
  // }

  // function handleHomeClick() {
  //   window.ifusion.tabs.hideAllTabs();
  //   setActiveTabIndex(-1);
  // }

  return (
    <div className={styles["nav-btns-container"]}>
      {/* Home Button */}
      <div
        onClick={hideAllTabs}
        className={`
        ${styles["icon-container"]} 
        ${styles["btn"]}  
        ${activeTabIndex === -1 ? styles["active"] : ""} 
        ${styles["home-btn"]}`}
      >
        <VscHome />
      </div>

      {/* Tabs */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
      >
        <div className={styles["tabs-container"]}>
          <SortableContext items={tabs} strategy={horizontalListSortingStrategy}>
            {tabs.map((tab, idx) => {
              return (
                <Tab
                  title={tab.title}
                  key={tab.id}
                  id={tab.id}
                  onSelect={() => switchToTab(tab.id)}
                  onClose={(event: React.MouseEvent) => closeTab(tab.id)}
                  isActive={idx === activeTabIndex}
                />
              );
            })}
          </SortableContext>
        </div>
      </DndContext>

      {/* New Tab Button */}
      {/* <div
        onClick={() => {
          createNewTab();
        }}
        className={`${styles["icon-container"]} ${styles["btn"]}`}
      >
        <VscAdd />
      </div> */}
    </div>
  );
}
