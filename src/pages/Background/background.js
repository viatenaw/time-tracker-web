import { formatTime } from './../../../utils/helpers/index';

let timeCounter = 0;
let intervalId = null;
function incrementCounter(tabId) {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  intervalId = setInterval(async function () {
    timeCounter++;
    await updateTabTime(tabId, formatTime(timeCounter));
  }, 1000);
}

function stopIncrement() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Counter stopped.');
  }
}

// (async () => {
//   await chrome.storage.sync.set({ TABS_DATA: [] });
//   await chrome.storage.sync.set({
//     ACTIVE_TAB_DATA: undefined,
//   });
// })();

async function updateTabTime(tabId, text) {
  await chrome.action.setBadgeText({
    tabId,
    text,
  });
}

async function handleTabCreated(event) {
  //
  try {
    handleUpdateTracker(event, 'CREATE');
  } catch (error) {
    console.error('error in handleTabCreated', error);
  }
}

async function handleTabUpdated(...event) {
  // todo: need to handle update event fired multiple times for the first tab
  try {
    const [tabId, changeInfo, tab] = event;
    handleUpdateTracker(tab, 'UPDATE');
  } catch (error) {
    console.error('error in handleTabUpdated', error);
  }
}

async function handleTabActivated(event) {
  try {
    const { tabId } = event;
    let tabData = await chrome.tabs.get(tabId);
    handleUpdateTracker(tabData, 'ACTIVE');
  } catch (error) {
    console.error('error in handleTabActivated', error);
  }
}

async function handleUpdateTracker(currentTabData, eventType) {
  if (
    !currentTabData.active ||
    !currentTabData.url ||
    currentTabData.status !== 'complete'
  )
    return; // ignore if the tab is not active
  let { TABS_DATA: tabs } = await chrome.storage.sync.get('TABS_DATA');
  let { ACTIVE_TAB_DATA: activeTab } = await chrome.storage.sync.get(
    'ACTIVE_TAB_DATA'
  );
  console.log(`<<<${eventType} event>>>`, {
    currentTabData,
    tabs,
    activeTab,
  });
  stopIncrement();
  if (!tabs.length || !activeTab) {
    console.log('creating new??');
    timeCounter = 0;
    tabs = [
      {
        url: currentTabData?.url,
        totalRunTime: timeCounter,
        lastAccessed: currentTabData?.lastAccessed,
        tabs: [
          { tabId: currentTabData?.id, windowId: currentTabData?.windowId },
        ],
      },
    ];
    activeTab = {
      id: currentTabData.id,
      windowId: currentTabData?.windowId,
      lastAccessed: currentTabData?.lastAccessed,
      totalRunTime: timeCounter,
      url: currentTabData?.url,
    };
    console.log(`--${eventType}-- set1`, { tabs, activeTab });
    await chrome.storage.sync.set({ TABS_DATA: tabs });
    await chrome.storage.sync.set({
      ACTIVE_TAB_DATA: activeTab,
    });
    incrementCounter();
    return;
  }
  let previousTab = activeTab;

  const allTabs = tabs;

  let newRunTime = 0;
  let newTabs = [];
  let urlExists = allTabs?.some((tabEl) => tabEl?.url === currentTabData?.url);
  if (previousTab.url !== currentTabData.url) {
    if (!urlExists) {
      console.log('no url exists');
      newRunTime = 0;
      newTabs = allTabs.map((tabEl) => {
        const updatedTabData = { ...tabEl };
        if (tabEl.url === previousTab.url) {
          // update the runtime for the previous tab
          console.log(`updating prev-tab run time`, timeCounter);
          updatedTabData.totalRunTime = timeCounter;
        }
        return updatedTabData;
      });
      newTabs.push({
        url: currentTabData?.url,
        totalRunTime: timeCounter,
        lastAccessed: currentTabData?.lastAccessed,
        tabs: [
          { tabId: currentTabData?.id, windowId: currentTabData?.windowId },
        ],
      });
    } else {
      // loop through the tabs
      newTabs = allTabs.map((tabEl) => {
        // find the matching tab data for the current URL
        const updatedTabData = { ...tabEl };
        if (tabEl.url === currentTabData.url) {
          console.log('got matching results for......', tabEl.url, tabEl);
          // get the tab runtime from tabEl
          newRunTime = tabEl.totalRunTime;
          let tabExists = tabEl?.tabs.some(
            (el) => el.tabId === currentTabData.id
          );

          // add the tab to the list if the tab doesn't exists in the list
          if (!tabExists) {
            updatedTabData.tabs.push({
              tabId: currentTabData.id,
              windowId: currentTabData?.windowId,
            });
            return updatedTabData;
          }
        }
        if (tabEl.url === previousTab.url) {
          // update the runtime for the previous tab
          console.log(`updating prev-tab run time`, timeCounter);

          updatedTabData.totalRunTime = timeCounter;
        } else {
          console.log(`no entry found for prev tab ?? really??`);
        }

        return updatedTabData;
      });
    }
  } else {
    incrementCounter();
    return;
  }
  console.log('newRunTime......', newRunTime);

  timeCounter = newRunTime;
  activeTab = {
    id: currentTabData.id,
    windowId: currentTabData?.windowId,
    lastAccessed: currentTabData?.lastAccessed,
    totalRunTime: timeCounter,
    url: currentTabData?.url,
  };
  console.log(`--${eventType}-- set2`, newTabs);

  await chrome.storage.sync.set({ TABS_DATA: newTabs });
  await chrome.storage.sync.set({
    ACTIVE_TAB_DATA: activeTab,
  });
  incrementCounter();
}

chrome.tabs.onActivated.addListener(handleTabActivated);

chrome.tabs.onCreated.addListener(handleTabCreated);

chrome.tabs.onUpdated.addListener(handleTabUpdated);
