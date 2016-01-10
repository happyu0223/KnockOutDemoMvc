/*
 * Functions definition for crossing browser compatable purpose.
 * Created by: Dawson Liu
 * Created Date: 3/13/2013
 */

$(document).ready(function () {
    var setMenu = function () {
        var set = false;
        var path = window.location.href;
        $("#sidebar > ul > li:not('.submenu')").each(function (i, elem) {
            var item = $(elem), tag = item.data('tag');
            if (tag && path.indexOf(tag) > -1) {
                item.addClass('open').addClass('active');
                set = true;
            }
        });

        if (set) return;

        var $submenus = $('.submenu');
        $submenus.removeClass('.delactive').removeClass('.open');
        function _any(patterns, str) {
            var result = false;
            $.each(patterns, function (i, pattern) {
                result = result || (str.indexOf(pattern) > -1);
                if (result) return false;
            });
            return result;
        }
        var found = false;
        $('#sidebar .submenu').each(function (i, submenu) {
            var $submenu = $(submenu), controllerTag = $submenu.data('tag') || '';
            $submenu.find('li').each(function (j, li) {
                var $li = $(li), filters = ($li.data('tag') || '').split(' '), regex;
                if (!filters.length) return;
                $.each(filters, function (k, filter) {
                    if (filter.indexOf('/') == -1) filter = '/{0}/{1}'.format(controllerTag, filter);
                    if (filter[0] != '/') filter = '/' + filter;
                    regex = new RegExp(filter.replace(/\/|\?/gi, function (match) { return '\\' + match; }) + (['/', '?', '$', ')'].indexOf(filter[filter.length - 1]) > -1 ? '' : '([\/\?]|$)'), 'gi');
                    found = regex.test(path);
                    if (found) return false;
                });
                if (found) {
                    $li.addClass('open');
                    $submenu.addClass('open').addClass('delactive')
                            .find('.label > i.icon-chevron-up').removeClass('icon-chevron-up').addClass('icon-chevron-down');
                    return false;
                }
            });
            if (found) return false;
        });
    }
    setMenu();
    var lastSubSubMenu = null;
    $('.submenu > a').hover(function (e) {
        var $this = $(this);
        if (_isSidebarCollapsed()) {
            if (lastSubSubMenu) lastSubSubMenu.hide();
            lastSubSubMenu = $($this.siblings('ul')[0]);
            var newTop = Math.min($this.offset().top, $(window).height() - lastSubSubMenu.height());
            lastSubSubMenu.css('top', newTop + 'px').show();
            e.stopPropagation();
        } else {
            $this.children('.label.icon').toggleClass('hide');
        }
    }, function () {
        var $this = $(this);
        if (_isSidebarCollapsed()) {
            lastSubSubMenu = $($this.siblings('ul')[0]);
        } else {
            $this.children('.label.icon').toggleClass('hide');
        }
    });
    $('.submenu').mouseleave(function () {
        if (_isSidebarCollapsed() && lastSubSubMenu) {
            lastSubSubMenu.hide();
            lastSubSubMenu = null;
        }
    });

    function _isSidebarCollapsed() {
        return (($(window).width() < 769) || $sidebar.hasClass('collapsed'));
    }

    $('#sidebar > ul > li > a').hover(function () {
        if (_isSidebarCollapsed()) {
            $(this).tooltip({ title: $($(this).children('span')[0]).text(), placement: 'bottom', container: 'body', trigger: 'manual' });
            $(this).tooltip('show');
        }
    }, function () {
        if (_isSidebarCollapsed()) $(this).tooltip('hide');
    });

    $('.submenu > a').click(function (e) {
        e.preventDefault();
        var submenu = $(this).siblings('ul');
        var prevSubmenu = $('#sidebar li.open ul');
        var li = $(this).parent('li');
        if (li.hasClass('open')) {
            if (!_isSidebarCollapsed()) {
                submenu.slideUp('fast', function () {
                    sidebarHeight = $sidebar.height();
                    currentUlHeight = ul.height();
                    setScrollState();
                });
            } else {
                setScrollState();
                e.preventDefault();
                // show sub-sub menu
            }
            li.removeClass('open');
        } else {
            if (!_isSidebarCollapsed()) {
                if (prevSubmenu.length) {
                    prevSubmenu.slideUp('fast', function () {
                        submenu.slideDown('fast', function () {
                            sidebarHeight = $sidebar.height();
                            currentUlHeight = ul.height();
                            setScrollState();
                        });
                    });
                    prevSubmenu.parent().removeClass('open');
                } else {
                    submenu.slideDown('fast', function () {
                        sidebarHeight = $sidebar.height();
                        currentUlHeight = ul.height();
                        setScrollState();
                    });
                }
            } else {
                setScrollState();
                e.preventDefault();
            }
            li.addClass('open');
        }
    });
    var $sidebarCollapser = $('#sidebar-collapser');
    $sidebarCollapser.click(function (e) {
        e.preventDefault();
        $sidebar.toggleClass('collapsed');
        $('#content').toggleClass('collapsed');
        $sidebarCollapser.toggleClass('collapsed');
        $sidebarCollapser.children('i').toggleClass('icon-chevron-left icon-chevron-right');
        Cookies.set('SideBarIsCollapsed', Cookies.get('SideBarIsCollapsed') != 'true');
    });

    var $sidebar = $('#sidebar'), $menuContainer = $('#menuContainer'), ul = $('#sidebar > ul'), $scrolls = $('.scroll'),
        $content1 = $('#content1'), $content2 = $('#content2'),
        sidebarHeight = $sidebar.height(), currentUlHeight = ul.height(), menuContainerHeight = $menuContainer.height();

    $('.up-scroll').hover(function () {
        ul.animate({ top: '0px' }, 'fast');
    });
    $('.down-scroll').hover(function () {
        var offset = sidebarHeight - currentUlHeight;
        ul.animate({ top: offset + 'px' }, 'fast');
    });

    function setScrollState() {
        if (menuContainerHeight >= currentUlHeight) {
            $scrolls.hide();
            ul.css({ top: '0px' });
            $sidebar.css('height', '');
            sidebarHeight = $sidebar.height();
        } else {
            sidebarHeight = menuContainerHeight - 50;
            $sidebar.css('height', sidebarHeight + 'px');
            $scrolls.show();
        }
        $content2.css('height', ($content1.height() - 40) + 'px');
    }

    // === Resize window related === //
    var intervalId, isHandling = false, isMoving = false, $window = $(window);
    $window.resize(function (e) {
        var run = function () {
            if (isHandling) return;
            if (!isMoving) {
                if (intervalId) clearInterval(intervalId);
                intervalId = null;
                isHandling = false;
                isMoving = true;
                run();
                return;
            }
            isHandling = true;
            if ($window.width() < 768) $sidebarCollapser.hide();
            else $sidebarCollapser.show();
            $('#container').css('height', ($window.height() - 97) + 'px');
            menuContainerHeight = $menuContainer.height();
            sidebarHeight = $sidebar.height();
            currentUlHeight = ul.height();
            setScrollState();
            $('#sidebar > ul').css({ top: '0px' });
            timerId = null;
            isHandling = false;
            isMoving = false;
        }
        isMoving = true;
        if (intervalId) return;
        intervalId = setInterval(run, 25);
    });
    setScrollState();

    // === Tooltips === //
    $('.tip').tooltip();
    $('.tip-left').tooltip({ placement: 'left' });
    $('.tip-right').tooltip({ placement: 'right' });
    $('.tip-top').tooltip({ placement: 'top' });
    $('.tip-bottom').tooltip({ placement: 'bottom' });
});


$(function () {
    $(".gmk-check-all-items").change(function () {
        var items = $(this).closest('table').find(".gmk-item-check:checkbox").not(":disabled");
        items.prop("checked", !$(this).is(":checked"));
        items.trigger("click");
    });

    $(".removeBtn").click(function () {
        $(this).closest('tr').hide();
    });

    $("#mainmenu li").each(function () {
        var navtag = $(this).data("navtag");
        if (navtag && location.href.toLowerCase().indexOf(navtag.toLowerCase()) > 0) {
            $(this).addClass("active");
        }
        else {
            $(this).removeClass("active");
        }
    });

    $(".datepicker:not(.hasDatepicker)").datepicker({
        showAnim: 'slide',
        beforeShow: function () {
            $(this).css({ 'z-index': '2000000', 'position': 'relative' });
        },
        onClose: function () {
            // TODO: should load the previous prop
            $(this).css({ 'z-index': 'auto', 'position': 'static' });
        }
    });
    $('.date-range-picker').each(function () {
        var $elem = $(this);
        $elem.daterangepicker({
            format: 'YYYY-MM-DD',
            separator: ' - ',
            opens: 'left',
            locale: {
                applyLabel: '应用',
                cancelLabel: '取消',
                fromLabel: '从',
                toLabel: '到',
                weekLabel: '周',
                firstDay: 1
            }
        });
        $elem.on('show.daterangepicker', function (ev, picker) {
            var dates = $elem.val().split(' - ');
            var startDate = moment(dates[0]);
            var endDate = moment(dates[1]);
            startDate = (startDate.isValid() ? startDate : moment()).startOf('day');
            endDate = (endDate.isValid() ? endDate : moment()).startOf('day');
            $elem.data('daterangepicker').setStartDate(startDate);
            $elem.data('daterangepicker').setEndDate(endDate);
        });
    });

    $(".removeRow").on("click", function () {
        $(this).closest('tr').remove();
    });
});


/* Widget close */

$('.wclose').click(function (e) {
    e.preventDefault();
    var $wbox = $(this).parent().parent().parent();
    $wbox.hide(100);
});

/* Widget minimize */

$('.wminimize').click(function (e) {
    e.preventDefault();
    var $wcontent = $(this).parent().parent().next('.widget-content');
    if ($wcontent.is(':visible')) {
        $(this).children('i').removeClass('icon-chevron-up');
        $(this).children('i').addClass('icon-chevron-down');
    }
    else {
        $(this).children('i').removeClass('icon-chevron-down');
        $(this).children('i').addClass('icon-chevron-up');
    }
    $wcontent.toggle(500);
});

$(function () {
    var toggle = function () {
        $(this).toggleClass('open');
    };
    $('#user-nav li.dropdown').hover(toggle, toggle);
    $(document).on('show.bs.dropdown', '.btn-group', function (e) {
        var target = $(e.currentTarget), cur = target.children('.dropdown-menu'), caret = target.children('button.dropdown-toggle').children('.caret');
        var footBarHeight = 30, headBarHeight = 120 + 10;
        var buttomPosition = target.offset().top + target.outerHeight() + cur.outerHeight() + footBarHeight;
        var topPosition = cur.outerHeight() + headBarHeight;
        
        if (buttomPosition > window.innerHeight) {
            if (topPosition < target.offset().top) { //上方的距离够放下ul
                cur.addClass('pull-top');
                caret.addClass('up');
            } else {
                if ((window.innerHeight - (target.offset().top + target.outerHeight() + footBarHeight)) > (target.offset().top - headBarHeight)) { //下方多出的距离大于上面多出的距离
                    cur.css("height", window.innerHeight - (target.offset().top + target.outerHeight() + footBarHeight));
                    cur.css("overflow-y", "auto");
                    cur.removeClass('pull-top');
                } else {
                    cur.addClass('pull-top');
                    cur.css("height",target.offset().top - headBarHeight);
                    cur.css("overflow-y", "auto");
                    caret.addClass('up');
                }
            }
        } else {            
            cur.removeClass('pull-top');
        }
    }).on('hide.bs.dropdown', '.btn-group', function (e) {
        var target = $(e.currentTarget), cur = target.children('.dropdown-menu'), caret = target.children('button.dropdown-toggle').children('.caret');
        caret.removeClass('up');
        cur.css("height", "auto");
        cur.css("overflow-y", "");
    });
});

window._alert = window.alert;
window._confirm = window.confirm;
window.alert = utils.alert;
window.confirm = utils.confirm;
