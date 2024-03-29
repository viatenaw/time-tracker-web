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
    // console.log('timeCounter', timeCounter);
  }, 1000);
}

function stopIncrement() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Counter stopped.');
  }
}
// export async function getCurrentTab() {
//   let queryOptions = { active: true, lastFocusedWindow: true };
//   // `tab` will either be a `tabs.Tab` instance or `undefined`.
//   let [tab] = await chrome.tabs.query(queryOptions);
//   console.log('tab....>', tab);

//   return tab;
// }

(async () => {
  await chrome.storage.local.set({ TABS_DATA: [] });
  await chrome.storage.local.set({
    ACTIVE_TAB_DATA: undefined,
  });
})();

async function updateTabTime(tabId, text) {
  // console.log('updateTabTime', tabId, text);

  await chrome.action.setBadgeText({
    tabId,
    text,
  });
}

async function startTimeTracking(tabId, tabData) {
  //
  console.log('tabs<<<....>', tabData);
}

async function handleTabCreated(event) {
  //
  try {
    console.log('create', event);
    // const { active: isActive, ...tabData } = event;

    handleUpdateTracker(event);
  } catch (error) {
    console.error('error in handleTabCreated', error);
  }
}

async function handleTabUpdated(...event) {
  //
  try {
    console.log('update', event);
    const [tabId, changeInfo, tab] = event;
    console.log('handleTabUpdated', tabId, changeInfo, tab, tab.status);
    handleUpdateTracker(tab);
  } catch (error) {
    console.error('error in handleTabUpdated', error);
  }
}

async function handleTabActivated(event) {
  console.log('active', event, timeCounter);
  try {
    const { tabId } = event;
    console.log('active tabId', tabId);
    let tabData = await chrome.tabs.get(tabId);
    handleUpdateTracker(tabData);
    console.log('active tabData', tabData);
  } catch (error) {
    console.error('error in handleTabActivated', error);
  }
}

async function handleUpdateTracker(tabData) {
  if (!tabData.active | !tabData.url) return; // ignore if the tab is not active
  let { TABS_DATA: tabs } = await chrome.storage.local.get('TABS_DATA');
  let { ACTIVE_TAB_DATA: activeTab } = await chrome.storage.local.get(
    'ACTIVE_TAB_DATA'
  );
  console.log(
    'active---tabs',
    tabs,
    activeTab,
    !Boolean(tabs.length),
    !Boolean(activeTab)
  );
  stopIncrement();
  if (!Boolean(tabs.length) || !Boolean(activeTab)) {
    console.log('creating new??');
    timeCounter = 0;
    tabs = [
      {
        url: tabData?.url,
        totalRunTime: timeCounter,
        lastAccessed: tabData?.lastAccessed,
        tabs: [{ tabId: tabData?.id, windowId: tabData?.windowId }],
      },
    ];
    activeTab = {
      id: tabData.id,
      windowId: tabData?.windowId,
      lastAccessed: tabData?.lastAccessed,
      totalRunTime: timeCounter,
      url: tabData?.url,
    };
    console.log('active set1', tabs);
    await chrome.storage.local.set({ TABS_DATA: tabs });
    await chrome.storage.local.set({
      ACTIVE_TAB_DATA: activeTab,
    });
    incrementCounter();

    return;
  }
  console.log('active tab......s', tabs);
  let previousTab = activeTab;

  const allTabs = tabs;

  let newRunTime = 0;
  let newTabs = [];
  let urlExists = allTabs?.some((tabEl) => tabEl.url === tabData.url);
  if (previousTab.url !== tabData.url) {
    if (!urlExists) {
      console.log('no url exists');

      newRunTime = 0;
      newTabs = [
        ...allTabs,
        {
          url: tabData?.url,
          totalRunTime: timeCounter,
          lastAccessed: tabData?.lastAccessed,
          tabs: [{ tabId: tabData?.id, windowId: tabData?.windowId }],
        },
      ];
    } else {
      // loop through the tabs
      newTabs = allTabs.map((tabEl) => {
        if (tabEl.url === tabData.url) {
          // get the tab runtime from tabEl
          console.log('tabEl......s', tabEl);

          newRunTime = tabEl.totalRunTime;
          let tabExists = tabEl?.tabs.some((el) => el.tabId === tabData.id);
          // update the tab list if the tab doesn't exists in the list
          if (!tabExists) {
            return {
              ...tabEl,
              tabs: [
                ...tabEl.tabs,
                {
                  tabId: tabData.id,
                  windowId: tabData?.windowId,
                },
              ],
            };
          }
        } else if (tabEl.url === previousTab.url) {
          // update the runtime for the previous tab
          tabEl.totalRunTime = timeCounter;
        }
        return tabEl;
      });
    }
  } else {
    incrementCounter();
    return;
  }
  console.log('newRunTime......', newRunTime);

  timeCounter = newRunTime;
  activeTab = {
    id: tabData.id,
    windowId: tabData?.windowId,
    lastAccessed: tabData?.lastAccessed,
    totalRunTime: timeCounter,
    url: tabData?.url,
  };
  console.log('active set2', newTabs);

  await chrome.storage.local.set({ TABS_DATA: newTabs });
  await chrome.storage.local.set({
    ACTIVE_TAB_DATA: activeTab,
  });
  incrementCounter();
}

chrome.tabs.onActivated.addListener(handleTabActivated);

chrome.tabs.onCreated.addListener(handleTabCreated);

chrome.tabs.onUpdated.addListener(handleTabUpdated);
