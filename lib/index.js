"use strict";
// 使用前提：所有内容中表示菜单项的元素都必须包含 data-scroll-menu-item="<number>" 的属性，
// 其中，number 是编号，用来表示菜单的层级关系，例如 1、1.1、1.1.1 等等
// 内容中可使用 data-scroll-menu-title 来表示这是标题内容的包裹元素
var MENU_ITEM_ATTRIBUTE = 'data-scroll-menu-item';
var MENU_ITEM_TITLE_ATTRIBUTE = 'data-scroll-menu-title';
function renderList(element) {
    return element.join('');
}
function renderTree(tree) {
    var element = document.createElement('div');
    element.innerHTML = tree;
    var lastChild = element.lastChild;
    if (lastChild) {
        document.body.appendChild(lastChild);
    }
}
function computeMenuTree(menuItems) {
    var menuTree = {};
    // 遍历 menuItems，重新组装成一个树状结构
    menuItems.forEach(function (menuItem) {
        // 编号，例如 1.1
        var itemNumber = menuItem.getAttribute(MENU_ITEM_ATTRIBUTE) || '';
        // 编号组，例如 [1, 1]
        var itemNumbers = itemNumber.split('.').map(function (item) { return parseInt(item, 10); });
        // 将元素放入到 menuTree 中
        var walkTree = menuTree;
        var modifiedItem;
        for (var index = 0; index < itemNumbers.length; index++) {
            var number = itemNumbers[index];
            // 辨别不出来的 number，统统认为是 0
            var numberFormat = Number.isNaN(number) ? 0 : number;
            // 遍历的时候，发现不存在的项，要至少补齐一个
            if (!walkTree[numberFormat] || !walkTree[numberFormat].length) {
                walkTree[numberFormat] = [{
                        fullKey: '',
                        title: '',
                        children: {},
                        level: 0
                    }];
            }
            // 新菜单总是加在更后面的父目录下面
            var items = walkTree[numberFormat];
            modifiedItem = items[items.length - 1];
            walkTree = modifiedItem.children;
        }
        // 给需要修改的项加上标题
        if (modifiedItem) {
            var titleElement = menuItem.querySelector("[" + MENU_ITEM_TITLE_ATTRIBUTE + "]");
            // 没有找到标题的话，就给个默认标题
            var title = (titleElement === null || titleElement === void 0 ? void 0 : titleElement.innerHTML) || '未命名标题';
            modifiedItem.title = title;
            modifiedItem.fullKey = itemNumber;
            modifiedItem.level = itemNumbers.length;
        }
    });
    return menuTree;
}
function getRenderMenuList(menuTree, currentMenuItemKey) {
    if (currentMenuItemKey === void 0) { currentMenuItemKey = ''; }
    var numbers = Object.keys(menuTree).map(function (number) { return Number(number); }).sort();
    return renderList(numbers.map(function (number) {
        var items = menuTree[number];
        return renderList(items.map(function (item) {
            var fullKey = item.fullKey, title = item.title, children = item.children, level = item.level;
            var keys = Object.keys(children);
            return ("<div class=\"scroll-menu-item\" data-key=\"" + fullKey + "\">\n          <p class=\"" + ("scroll-menu-item-title" + (currentMenuItemKey === fullKey ? ' scroll-menu-item-current-title' : '')) + "\" data-level=\"" + level + "\" data-key=\"" + fullKey + "\">" + fullKey + ". " + title + "</p>\n          " + (keys.length
                ? ("<div class=\"scroll-menu-item-list\" data-key=\"" + fullKey + "\">\n                  " + getRenderMenuList(children, currentMenuItemKey) + "\n                </div>")
                : '') + "\n        </div>");
        }));
    }));
}
function getRenderMenuTree(menuTree) {
    return ("<div class=\"scroll-menu\">\n      <div class=\"scroll-side-line\"></div>\n      <div class=\"scroll-wrapper\">\n        " + getRenderMenuList(menuTree) + "\n      </div>\n    </div>");
}
function reRenderMenuList(menuTree, currentMenuItemKey) {
    var element = document.querySelector('.scroll-menu .scroll-wrapper');
    if (element) {
        element.innerHTML = getRenderMenuList(menuTree, currentMenuItemKey);
    }
}
function scrollMenu(options) {
    if (options === void 0) { options = {}; }
    var _a = options.container, container = _a === void 0 ? '' : _a;
    var containerElement = container ? document.querySelector(container) : document;
    // 找到所有的菜单项
    var menuItems = Array.from((containerElement === null || containerElement === void 0 ? void 0 : containerElement.querySelectorAll("[" + MENU_ITEM_ATTRIBUTE + "]")) || []);
    // 生成菜单树
    var menuTree = computeMenuTree(menuItems);
    // 渲染菜单树
    var tree = getRenderMenuTree(menuTree);
    renderTree(tree);
    // 绑定滚动事件
    var currentKey = '';
    containerElement === null || containerElement === void 0 ? void 0 : containerElement.addEventListener('scroll', function (event) {
        var currentTarget = event.currentTarget;
        if (currentTarget) {
            // 计算出 menuItems 中第一个距离容器高度大于 0 的上一次内容项
            var containerElementTop = 0;
            if ('getBoundingClientRect' in containerElement) {
                var top_1 = containerElement.getBoundingClientRect().top;
                containerElementTop = top_1;
            }
            var currentMenuItem = null;
            for (var index = 0; index < menuItems.length; index++) {
                var menuItem = menuItems[index];
                var top_2 = menuItem.getBoundingClientRect().top;
                if (Math.round(top_2 - containerElementTop) > 0) {
                    var prevIndex = index - 1 < 0 ? 0 : index - 1;
                    currentMenuItem = menuItems[prevIndex];
                    break;
                }
            }
            // 重新渲染菜单树
            var nextKey = currentMenuItem === null || currentMenuItem === void 0 ? void 0 : currentMenuItem.getAttribute(MENU_ITEM_ATTRIBUTE);
            if (nextKey && nextKey !== currentKey) {
                currentKey = nextKey;
                reRenderMenuList(menuTree, currentKey);
            }
        }
    });
    // 监听菜单的点击事件
    var menuContainer = document.querySelector('.scroll-menu');
    menuContainer === null || menuContainer === void 0 ? void 0 : menuContainer.addEventListener('click', function (event) {
        var target = event.target;
        var titleElement = target === null || target === void 0 ? void 0 : target.closest('[data-key]');
        var dataKey = titleElement === null || titleElement === void 0 ? void 0 : titleElement.getAttribute('data-key');
        var containerElementTop = 0;
        if (containerElement && 'getBoundingClientRect' in containerElement) {
            var top_3 = containerElement.getBoundingClientRect().top;
            containerElementTop = top_3;
        }
        // 找到和 dataKey 一致的 menuItem
        for (var index = 0; index < menuItems.length; index++) {
            var menuItem = menuItems[index];
            var menuItemKey = menuItem.getAttribute(MENU_ITEM_ATTRIBUTE);
            if (menuItemKey === dataKey) {
                var top_4 = menuItem.getBoundingClientRect().top;
                // 计算项与容器间的距离
                var deltaTop = top_4 - containerElementTop;
                // 滚动到那里去
                if (containerElement && 'scrollTop' in containerElement) {
                    var nextScrollTop = containerElement.scrollTop + deltaTop;
                    containerElement.scrollTo({
                        top: nextScrollTop,
                        behavior: 'smooth'
                    });
                }
                break;
            }
        }
    });
}
window.scrollMenu = scrollMenu;
