import React, { createContext, useContext, useState } from "react";

interface TabContextType {
  tabs: TabUIInfo[];
  activeTabIndex: number;
  createNewTab: (extensionUniqueId: string) => Promise<void>;
  switchToTab: (tabId: string) => Promise<void>;
  closeTab: (tabId: string) => Promise<void>;
  reorderTab: (oldIndex: number, newIndex: number) => void;
  hideAllTabs: () => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export const TabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tabs, setTabs] = useState<TabUIInfo[]>([]);

  const [activeTabIndex, setActiveTabIndex] = useState<number>(-1);

  async function createNewTab(extensionUniqueId: string) {
    let response = await window.ifusion.tabs.createNewTab(extensionUniqueId);

    if(!response.data){
        console.log("Extension disabled");
        return ;
    }
    
    setActiveTabIndex(tabs.length);
    setTabs((prevTabs) => [...prevTabs, response.data!]);
  }

  async function switchToTab(tabId: string) {
    let response = await window.ifusion.tabs.switchToTab(tabId);

    setActiveTabIndex(response.data!.activeTabIndex);
  }

  async function closeTab(tabId: string) {
    let response = await window.ifusion.tabs.closeTab(tabId);

    setTabs((prevTabs) => {
      const updatedTabs = prevTabs.filter((tab) => tab.id !== tabId);

      return updatedTabs;
    });
    setActiveTabIndex(response.data!.activeTabIndex);
  }

  function reorderTab(oldIndex: number, newIndex: number) {
    setTabs((prevTabs) => {
      const updatedTabs = [...prevTabs];
      const [movedTab] = updatedTabs.splice(oldIndex, 1);
      updatedTabs.splice(newIndex, 0, movedTab);
      return updatedTabs;
    });
    setActiveTabIndex(newIndex);
    window.ifusion.tabs.reorderTab(oldIndex, newIndex);
  }

  function hideAllTabs() {
    window.ifusion.tabs.hideAllTabs();
    setActiveTabIndex(-1);
  }

  return (
    <TabContext.Provider
      value={{ tabs, activeTabIndex, createNewTab, switchToTab, closeTab, reorderTab, hideAllTabs }}
    >
      {children}
    </TabContext.Provider>
  );
};

export const useTabContext = () => {
  const context = useContext(TabContext);

  if (!context) {
    throw new Error("useTabContext must be used within a TabProvider");
  }

  return context;
};
