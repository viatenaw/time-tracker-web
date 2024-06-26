import { formatTime } from './../../../../utils/helpers/index';

async function updateTabTime(tabId, text) {
  // console.log('updateTabTime', tabId, text);

  await chrome.action.setBadgeText({
    tabId,
    text,
  });
}

function incrementCounter(tabId) {
  if (window.timeTrackingintervalId) {
    clearInterval(window.timeTrackingintervalId);
    window.timeTrackingintervalId = null;
  }
  window.timeTrackingintervalId = setInterval(async function () {
    window.timeTrackingCounter++;
    await updateTabTime(tabId, formatTime(window.timeTrackingCounter));
    // console.log('window.timeTrackingCounter', window.timeTrackingCounter);
  }, 1000);
}

function stopIncrement() {
  if (window.timeTrackingintervalId) {
    clearInterval(window.timeTrackingintervalId);
    window.timeTrackingintervalId = null;
    console.log('Counter stopped.');
  }
}

export const handleUpdateTracker = async (tabData, eventType) => {
  if (!tabData.active | !tabData.url) return; // ignore if the tab is not active
  let { TABS_DATA: tabs } = await chrome.storage.local.get('TABS_DATA');
  let { ACTIVE_TAB_DATA: activeTab } = await chrome.storage.local.get(
    'ACTIVE_TAB_DATA'
  );
  console.log(
    eventType,
    '---tabs',
    tabs,
    activeTab,
    !Boolean(tabs.length),
    !Boolean(activeTab)
  );
  stopIncrement();
  if (!Boolean(tabs.length) || !Boolean(activeTab)) {
    console.log('creating new??');
    window.timeTrackingCounter = 0;
    tabs = [
      {
        url: tabData?.url,
        totalRunTime: window.timeTrackingCounter,
        lastAccessed: tabData?.lastAccessed,
        tabs: [{ tabId: tabData?.id, windowId: tabData?.windowId }],
      },
    ];
    activeTab = {
      id: tabData.id,
      windowId: tabData?.windowId,
      lastAccessed: tabData?.lastAccessed,
      totalRunTime: window.timeTrackingCounter,
      url: tabData?.url,
    };
    console.log(eventType, ' set1', tabs);
    await chrome.storage.local.set({ TABS_DATA: tabs });
    await chrome.storage.local.set({
      ACTIVE_TAB_DATA: activeTab,
    });
    incrementCounter();

    return;
  }
  console.log(eventType, ' tab......s', tabs);
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
          totalRunTime: window.timeTrackingCounter,
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
          tabEl.totalRunTime = window.timeTrackingCounter;
        }
        return tabEl;
      });
    }
  } else {
    incrementCounter();
    return;
  }
  console.log('newRunTime......', newRunTime);

  window.timeTrackingCounter = newRunTime;
  activeTab = {
    id: tabData.id,
    windowId: tabData?.windowId,
    lastAccessed: tabData?.lastAccessed,
    totalRunTime: window.timeTrackingCounter,
    url: tabData?.url,
  };
  console.log(eventType, ' set2', newTabs);

  await chrome.storage.local.set({ TABS_DATA: newTabs });
  await chrome.storage.local.set({
    ACTIVE_TAB_DATA: activeTab,
  });
  incrementCounter();
};
