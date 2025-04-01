import { useEffect, useState } from "react";
import styles from "./Main.module.css";
import { useTabContext } from "../../contexts/TabContext";

export default function Main() {
  const [extensions, setExtensions] = useState<ExtensionManifest[]>([]);

  
  const {createNewTab} = useTabContext();

  async function fetchExtensions() {
    console.log("fetching extensions...");
    const extensionsInfo = await window.ifusion.extensions.listExtensions();
    setExtensions(extensionsInfo);
  }

  useEffect(() => {
    fetchExtensions();
  }, []);

  async function installExtension() {
    const extension = await window.ifusion.extensions.installExtension();
    console.log(extension);
    fetchExtensions();
  }

  async function uninstallExtension(extensionUniqueId: string){
    const res = await window.ifusion.extensions.uninstallExtension(extensionUniqueId);
    console.log(res);
    fetchExtensions();
  }

  async function enableExtension(extensionUniqueId: string){
      const res = await window.ifusion.extensions.enableExtension(extensionUniqueId);
      console.log(res);
      
  }

  async function disableExtension(extensionUniqueId: string){
    const res = await window.ifusion.extensions.disableExtension(extensionUniqueId);
      console.log(res);
  }

  function loadExtension(extensionUniqueId: string){

  }

  return (
    <main className={`${styles["main-container"]}`}>
      <button onClick={installExtension}>Add Extension</button>

      <div>
        {extensions.map(ext =>{
            return <div className={`${styles["extension-card"]}`} key={ext.uniqueId}>
                <h3>{ext.name}</h3>
                <p>{ext.developer}</p> 
                <p>{ext.version}</p>
                <p>{ext.description}</p>
                <p>Category: {ext.category}</p>

                <button onClick={()=> createNewTab(ext.uniqueId!)}>Load</button>
                <button onClick={()=>uninstallExtension(ext.uniqueId!)}>Uninstall</button>

                <button disabled={ext.isEnabled === 1} onClick={()=> enableExtension(ext.uniqueId!)}>Enable Extension</button>
                <button disabled={ext.isEnabled === 0} onClick={()=> disableExtension(ext.uniqueId!)}>Disable Extension</button>

                   

            </div>
        })}

      </div>
    </main>
  );
}
