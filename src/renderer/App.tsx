import { useState } from "react";

import "./App.css";
import Header from "./components/Header/Header";
import Main from "./components/Main/Main";
import { TabProvider } from "./contexts/TabContext";

function App() {
  return (
    <div>
      <TabProvider>
        <Header />
        <Main />
      </TabProvider>
    </div>
  );
}

export default App;
