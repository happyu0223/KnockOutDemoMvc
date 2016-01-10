(function($) {
	$.fn.paginate = function(options) {
		var opts = $.extend({}, $.fn.paginate.defaults, options);
		return this.each(function() {
			$this = $(this);
			var o = $.meta ? $.extend({}, opts, $this.data()) : opts;
			var selectedpage = o.start;
			$.fn.draw(o,$this,selectedpage);	
		});
	};
	$.fn.paginate.defaults = {
        maxCount:10, // max showing page count
		count 		: 5, // page count
		start 		: 12, // the current selected page
		display: 5, // page size
		itemCount: 0, // total items
        begin:1, // the beginning page index
		border					: true,
		border_color			: '#fff',
		text_color  			: '#8cc59d',
		background_color    	: 'black',	
		border_hover_color		: '#fff',
		text_hover_color  		: '#fff',
		background_hover_color	: '#fff', 
		//rotate      			: true,
		images					: true,
		//mouse					: 'slide',
		onChange				: function(){return false;}
	};
	$.fn.draw = function (o, obj, selectedpage) {
		$this.empty();
		if(o.images){
			var spreviousclass 	= 'jPag-sprevious-img';
			var previousclass 	= 'jPag-previous-img';
			var snextclass 		= 'jPag-snext-img';
			var nextclass 		= 'jPag-next-img';
		}
		else{
			var spreviousclass 	= 'jPag-sprevious';
			var previousclass 	= 'jPag-previous';
			var snextclass 		= 'jPag-snext';
			var nextclass 		= 'jPag-next';
		}
		var _first		= $(document.createElement('a')).addClass('jPag-first').html('首页');
		var _prev = $('<a href="#">上一页</a>');
		var _divwrapleft	= $(document.createElement('div')).addClass('jPag-control-back');
		_divwrapleft.append(_first).append(_prev);

		var _ul = $(document.createElement('ul')).addClass('jPag-pages')
		var selobj;
		var base = o.begin > 1 ? o.begin : (o.start <= o.maxCount ? 1 : o.start - Math.floor(o.maxCount / 2));
		var count = Math.min(Math.min(o.count, o.maxCount) + base, o.count + 1);
		o.begin = base;
		for (var i = base; i < count; i++) {
			if(i == selectedpage){
			    var _obj = $(document.createElement('li')).addClass('jPag-current').text(i);
				selobj = _obj;
				_ul.append(_obj);
			} else {
				var _obj = $(document.createElement('li')).text(i);
				_ul.append(_obj);
			}
		}

		var _last = $(document.createElement('a')).addClass('jPag-last').html('尾页');
		var _next = $('<a href="#">下一页</a>');
		var _divwrapright	= $(document.createElement('div')).addClass('jPag-control-front');
		_divwrapright.append(_next).append(_last);
		//var pageCount = Math.ceil(o.itemCount / o.display);
		var currPageItemCount = Math.min(o.display * o.start, o.itemCount) - (o.display * (o.start - 1));
		var _summary = $('<div style="float:left;margin-left:10px;"></div>').html('当前页 <span>' + currPageItemCount + '</span> 行，共 <span>' + o.itemCount + '</span> 行， <span>' + o.count + '</span> 页');
		var _pageSize = $('<div style="float:right;"></div>');
		var _pageSizeUl = $('<ul class="jPag-page-size"><li>10</li><li>20</li><li>50</li></ul>');
		_findNthChild(_pageSizeUl, o.display).addClass('jPag-size-current');
		_pageSize.append('每页行数').append(_pageSizeUl);
		//append all:
		$this.addClass('jPaginate clearfix').append(_divwrapleft).append(_ul).append(_divwrapright).append(_summary).append(_pageSize);

			
		if(!o.border){
			if(o.background_color == 'none') var a_css = {'color':o.text_color};
			else var a_css = {'color':o.text_color,'background-color':o.background_color};
			if(o.background_hover_color == 'none')	var hover_css 	= {'color':o.text_hover_color};
			else var hover_css = {'color':o.text_hover_color,'background-color':o.background_hover_color};
		}
		else{
			if(o.background_color == 'none') var a_css = {'color':o.text_color,'border':'1px solid '+o.border_color};
			else var a_css = {'color':o.text_color,'background-color':o.background_color,'border':'1px solid '+o.border_color};
			if(o.background_hover_color == 'none')	var hover_css 	= {'color':o.text_hover_color,'border':'1px solid '+o.border_hover_color};
			else var hover_css = {'color':o.text_hover_color,'background-color':o.background_hover_color,'border':'1px solid '+o.border_hover_color};
		}
		
		$.fn.applystyle(o,$this,a_css,hover_css,_first,_ul,_divwrapright);

		function _findNthChild(ul, nth) {
		    var result, temp;
		    ul.children().each(function (i) {
		        temp = $(this);
		        if (temp.text() != nth) return;
		        result = temp;
		        return false;
		    });
		    return result;
		}
		function _doPrev(prev) {
		    var prevChild = _findNthChild(_ul, prev);
		    if (!prevChild) {
		        var start = prev - o.maxCount + 1, temp;
		        if (start < 0) start = 1;
		        o.begin = start;
		        _ul.children().each(function (i) {
		            $(this).text(start + i).show();
		            temp = i;
		        });
		        temp = temp + 1;
		        while (temp < o.maxCount) {
		            _ul.append($('<li>' + (start + temp) + '</li>').css(a_css));
		            temp = temp + 1;
		        }
		        prevChild = _findNthChild(_ul, prev);
		    }
		    prevChild.click();
		}
		function _doNext(next) {
		    var nextChild = _findNthChild(_ul, next);
		    if (!nextChild) {
		        o.begin = (next == o.count) ? (next - o.maxCount + 1) : next;
		        _ul.children().each(function (i) {
		            if (o.begin + i > o.count) $(this).text('').hide();
		            else $(this).text(o.begin + i);
		        });
		        nextChild = _findNthChild(_ul, next);
		    }
		    nextChild.click();
		}
	    // prev and next
		_prev.click(function (e) {
		    e.preventDefault();
		    var cur = _ul.children('.jPag-current').text();
		    var prev = parseInt(cur, 10) - 1;
		    if (prev < 1) return;
		    _doPrev(prev);
		});
		_next.click(function (e) {
		    e.preventDefault();
		    var cur = _ul.children('.jPag-current').text();
		    var next = parseInt(cur, 10) + 1;
		    if (next > o.count) return;
		    _doNext(next);
		});

		//first and last:
		_first.click(function (e) {
		    e.preventDefault();
		    _doPrev(1);
		});
		_last.click(function (e) {
		    e.preventDefault();
		    _doNext(o.count);
		});
		
	    //click a page
		_ul.on('click', 'li', function (e) {
            // TODO:
		    // if comes the first item, prev and first should be disabled else enable them
		    // if comes to the current showing end, check whether could load more pages
		    // if yes, load more at most half
		    // if no, it should be the real last page, next and last should be disabled
			selobj.removeClass('jPag-current'); 
			var currval = $(this).text();
			$(this).addClass('jPag-current');
			selobj = $(this);
			$.fn.applystyle(o,$(this).parent().parent(),a_css,hover_css,_first,_ul,_divwrapright);	
			o.onChange(currval, o.begin, o.display);
		});
		_pageSizeUl.find('li').click(function (e) {
		    o.display = parseInt($(this).text(), 10);
		    //parseInt(_ul.children('.jPag-current').text(), 10)
		    o.begin = 1;
		    o.onChange(1, o.begin, o.display);
		});
	}
	
	$.fn.applystyle = function (o, obj, a_css, hover_css, _first, _ul, _divwrapright) {
	        obj.find('.jPag-pages').children('li').css(a_css);
			obj.find('.jPag-current').css(hover_css);
	}
})(jQuery);
