interface ScrollMenuOptions {
  // 包裹内容的可滚动容器，传 selector
  container?: string
}

// 使用前提：所有内容中表示菜单项的元素都必须包含 data-scroll-menu-item="<number>" 的属性，
// 其中，number 是编号，用来表示菜单的层级关系，例如 1、1.1、1.1.1 等等
// 内容中可使用 data-scroll-menu-title 来表示这是标题内容的包裹元素
const MENU_ITEM_ATTRIBUTE = 'data-scroll-menu-item'
const MENU_ITEM_TITLE_ATTRIBUTE = 'data-scroll-menu-title'

interface MenuTree {
  // key 是单个编号
  [key: string]: {
    // 完整编号
    fullKey: string;
    title: string
    children: MenuTree
    level: number
  }[]
}

function renderList (element: string[]) {
  return element.join('')
}

function renderTree (tree: string) {
  const element = document.createElement('div')
  element.innerHTML = tree
  const lastChild = element.lastChild
  if (lastChild) {
    document.body.appendChild(lastChild)
  }
}

function computeMenuTree (menuItems: Element[]) {
  const menuTree: MenuTree = {}
  // 遍历 menuItems，重新组装成一个树状结构
  menuItems.forEach(menuItem => {
    // 编号，例如 1.1
    const itemNumber = menuItem.getAttribute(MENU_ITEM_ATTRIBUTE) || ''
    // 编号组，例如 [1, 1]
    const itemNumbers = itemNumber.split('.').map(item => parseInt(item, 10))
    // 将元素放入到 menuTree 中
    let walkTree = menuTree
    let modifiedItem
    for (let index = 0; index < itemNumbers.length; index++) {
      const number = itemNumbers[index]
      // 辨别不出来的 number，统统认为是 0
      const numberFormat = Number.isNaN(number) ? 0 : number
      // 遍历的时候，发现不存在的项，要至少补齐一个
      if (!walkTree[numberFormat] || !walkTree[numberFormat].length) {
        walkTree[numberFormat] = [{
          fullKey: '',
          title: '',
          children: {},
          level: 0
        }]
      }
      // 新菜单总是加在更后面的父目录下面
      const items = walkTree[numberFormat]
      modifiedItem = items[items.length - 1]
      walkTree = modifiedItem.children
    }
    // 给需要修改的项加上标题
    if (modifiedItem) {
      const titleElement = menuItem.querySelector(`[${MENU_ITEM_TITLE_ATTRIBUTE}]`)
      // 没有找到标题的话，就给个默认标题
      const title = titleElement?.innerHTML || '未命名标题'
      modifiedItem.title = title
      modifiedItem.fullKey = itemNumber
      modifiedItem.level = itemNumbers.length
    }
  })

  return menuTree
}

function getRenderMenuList (menuTree: MenuTree, currentMenuItemKey = ''): string {
  const numbers = Object.keys(menuTree).map(number => Number(number)).sort()
  return renderList(numbers.map(number => {
    const items = menuTree[number]
    return renderList(items.map(item => {
      const { fullKey, title, children, level } = item
      const keys = Object.keys(children)
      return (
        `<div class="scroll-menu-item" data-key="${fullKey}">
          <p class="${`scroll-menu-item-title${currentMenuItemKey === fullKey ? ' scroll-menu-item-current-title' : ''}`}" data-level="${level}" data-key="${fullKey}">${fullKey}. ${title}</p>
          ${
            keys.length
              ? (
                `<div class="scroll-menu-item-list" data-key="${fullKey}">
                  ${getRenderMenuList(children, currentMenuItemKey)}
                </div>`
              )
              : ''
          }
        </div>`
      )
    }))
  }))
}

function getRenderMenuTree (menuTree: MenuTree): string {
  return (
    `<div class="scroll-menu">
      <div class="scroll-side-line"></div>
      <div class="scroll-wrapper">
        ${getRenderMenuList(menuTree)}
      </div>
    </div>`
  )
}

function reRenderMenuList (menuTree: MenuTree, currentMenuItemKey: string) {
  const element = document.querySelector('.scroll-menu .scroll-wrapper')
  if (element) {
    element.innerHTML = getRenderMenuList(menuTree, currentMenuItemKey)
  }
}

function scrollMenu (options: ScrollMenuOptions = {}): void {
  const {
    container = ''
  } = options
  const containerElement = container ? document.querySelector(container) as (HTMLElement | null) : document

  // 找到所有的菜单项
  const menuItems = Array.from(containerElement?.querySelectorAll(`[${MENU_ITEM_ATTRIBUTE}]`) || []) as HTMLElement[]
  // 生成菜单树
  const menuTree = computeMenuTree(menuItems)
  // 渲染菜单树
  const tree = getRenderMenuTree(menuTree)
  renderTree(tree)

  // 绑定滚动事件
  let currentKey = ''
  containerElement?.addEventListener('scroll', (event) => {
    const currentTarget = event.currentTarget as (HTMLElement | null)
    if (currentTarget) {
      // 计算出 menuItems 中第一个距离容器高度大于 0 的上一次内容项
      let containerElementTop = 0
      if ('getBoundingClientRect' in containerElement) {
        const { top } = containerElement.getBoundingClientRect()
        containerElementTop = top
      }

      let currentMenuItem = null
      for (let index = 0; index < menuItems.length; index++) {
        const menuItem = menuItems[index]
        const { top } = menuItem.getBoundingClientRect()
        if (Math.round(top - containerElementTop) > 0) {
          const prevIndex = index - 1 < 0 ? 0 : index - 1
          currentMenuItem = menuItems[prevIndex]
          break
        }
      }

      // 重新渲染菜单树
      const nextKey = currentMenuItem?.getAttribute(MENU_ITEM_ATTRIBUTE)
      if (nextKey && nextKey !== currentKey) {
        currentKey = nextKey
        reRenderMenuList(menuTree, currentKey)
      }
    }
  })

  // 监听菜单的点击事件
  const menuContainer = document.querySelector('.scroll-menu')
  menuContainer?.addEventListener('click', (event) => {
    const target = event.target as (HTMLElement | null)
    const titleElement = target?.closest('[data-key]')
    const dataKey = titleElement?.getAttribute('data-key')
    let containerElementTop = 0
    if (containerElement && 'getBoundingClientRect' in containerElement) {
      const { top } = containerElement.getBoundingClientRect()
      containerElementTop = top
    }
    // 找到和 dataKey 一致的 menuItem
    for (let index = 0; index < menuItems.length; index++) {
      const menuItem = menuItems[index]
      const menuItemKey = menuItem.getAttribute(MENU_ITEM_ATTRIBUTE)
      if (menuItemKey === dataKey) {
        const { top } = menuItem.getBoundingClientRect()
        // 计算项与容器间的距离
        const deltaTop = top - containerElementTop
        // 滚动到那里去
        if (containerElement && 'scrollTop' in containerElement) {
          const nextScrollTop = containerElement.scrollTop + deltaTop
          containerElement.scrollTo({
            top: nextScrollTop,
            behavior: 'smooth'
          })
        }
        break
      }
    }
  })
}

window.scrollMenu = scrollMenu
