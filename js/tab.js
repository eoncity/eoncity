var Tab = function (element) {
    //指定当前元素
    this.element = $(element)
  }
//版本号为3.3.7
Tab.VERSION = '3.3.7'
//动画时间为150ms
Tab.TRANSITION_DURATION = 150

//show()方法用于触发show事件，调用activate原型方法，触发shown事件
Tab.prototype.show = function () {
    //当前tab
    var $this    = this.element
    //找到最近的ul
    var $ul      = $this.closest('ul:not(.dropdown-menu)')
    //找到data-target值
    var selector = $this.data('target')
    //如果data-target值不存在，查找href值
    if (!selector) {
      selector = $this.attr('href')
      //IE7特殊处理
      selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') 
    }
    //如果当前tab已经是活动状态了，即父元素li上已经有active样式的话，直接返回
    if ($this.parent('li').hasClass('active')) return
    //找到上一个元素，即上一个带有active样式的li里的a元素
    var $previous = $ul.find('.active:last a')
    //设置hide事件
    var hideEvent = $.Event('hide.bs.tab', {
      relatedTarget: $this[0]
    })
    //设置show事件
    var showEvent = $.Event('show.bs.tab', {
      relatedTarget: $previous[0]
    })
    //触发hide事件及show事件
    $previous.trigger(hideEvent)
    $this.trigger(showEvent)
    //如果自定义回调中阻止了默认行为，则不再继续处理
    if (showEvent.isDefaultPrevented() || hideEvent.isDefaultPrevented()) return
    //要激活显示的面板，即target或href里的值所对应的元素
    var $target = $(selector)
    //高亮显示当前tab
    this.activate($this.closest('li'), $ul)
    //显示对应的面板，并在回调里触发hidden及shown事件
    this.activate($target, $target.parent(), function () {
      $previous.trigger({
        type: 'hidden.bs.tab',
        relatedTarget: $this[0]
      })
      $this.trigger({
        type: 'shown.bs.tab',
        relatedTarget: $previous[0]
      })
    })
  }
  //active样式的应用，面板的显示和隐藏，以及tab的高亮与反高亮
  Tab.prototype.activate = function (element, container, callback) {
    //查找当前容器所有有active样式的元素
    var $active    = container.find('> .active')
    //判断是使用回调还是动画
    var transition = callback
      && $.support.transition
      && ($active.length && $active.hasClass('fade') || !!container.find('> .fade').length)

    function next() {
      $active
        //去除其他元素的active样式
        .removeClass('active')
        //包括li元素里面的下拉菜单里的active样式也要去除
        .find('> .dropdown-menu > .active')
          .removeClass('active')
        .end()
        .find('[data-toggle="tab"]')
          .attr('aria-expanded', false)

      element
        //给当前被单击的元素添加active高亮样式
        .addClass('active')
        .find('[data-toggle="tab"]')
          .attr('aria-expanded', true)

      if (transition) {
        //如果支持动画，就重绘页面
        element[0].offsetWidth 
        //并添加in样式，去除透明
        element.addClass('in')
      } else {
        //否则删除fade
        element.removeClass('fade')
      }
      //如果单击的是下拉菜单里的项目
      if (element.parent('.dropdown-menu').length) {
        element
          //打到最近的li.dropdown元素进行高亮
          .closest('li.dropdown')
            .addClass('active')
          .end()
          .find('[data-toggle="tab"]')
            .attr('aria-expanded', true)
      }
      //如果有回调就执行回调
      callback && callback()
    }
    //如果支持动画
    $active.length && transition ?
      $active
        //在动画结束后执行next()
        .one('bsTransitionEnd', next)
        .emulateTransitionEnd(Tab.TRANSITION_DURATION) :
      next()

    $active.removeClass('in')
  }

  function Plugin(option) {
    //根据选择器，遍历所有符合规则的元素
    return this.each(function () {
      var $this = $(this)
      //获取自定义属性bs.tab的值
      var data  = $this.data('bs.tab')
      //如果值不存在，则将Tab实例设置为bs.tab值
      if (!data) $this.data('bs.tab', (data = new Tab(this)))
      //如果option传递了string，则表示要执行某个方法  
      if (typeof option == 'string') data[option]()
    })
  }

  var old = $.fn.tab
  //保留其他库的$.fn.tab代码(如果定义的话)，以便在noConflict之后可以继续使用该老代码
  $.fn.tab             = Plugin
  //重设插件构造器，可以通过该属性获取插件的真实类函数
  $.fn.tab.Constructor = Tab


  $.fn.tab.noConflict = function () {
    //恢复以前的旧代码
   $.fn.tab = old
   //将$.fn.tab.noConflict()设置为Bootstrap的Tab插件
   return this
 }


 var clickHandler = function (e) {
    //阻止默认行为
    e.preventDefault()
    //触发show()方法
    Plugin.call($(this), 'show')
  }

  $(document)
    //在document上绑定单击事件
    .on('click.bs.tab.data-api', '[data-toggle="tab"]', clickHandler)
    .on('click.bs.tab.data-api', '[data-toggle="pill"]', clickHandler)