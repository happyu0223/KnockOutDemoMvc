;(function($, window, document, undefined) {

	'use strict';

	var pluginName = 'treeview';
	var internalDataKey = '__treeview_node_data__';

	var Tree = function(element, options) {

		this.$element = $(element);
		this._element = element;

		this.tree = []; // data behind
		this.root; // nodes behind
		if (!this.$element.hasClass('tree')) this.$element.addClass('tree');
		this._init(options);
	};

	Tree.defaults = {
	    expandIcon: 'fa fa-minus',
	    collapseIcon: 'fa fa-plus',
        showCheckbox: false,
        showTags: false,
        tagTemplate: '<input type="text" value="{0}" placeholder="信用等级" class="tree-node-tag" />',
        renderTag: function (template, tag) {
            return template.format(tag);
        },
        itemRenderedCallback: function () {
        }
	};

	Tree.prototype = {
		_destroy: function() {

		},

		_init: function(options) {
		
			if (options.data) {
			    if (typeof options.data === 'string') options.data = $.parseJSON(options.data);
				this.tree = options.data;
			}

			this.options = $.extend({}, Tree.defaults, options);

			this._destroy();
			this._render();
			this._bindEvents();
		},
		_bindEvents: function () {
		    var self = this;
		    this.$element.on('click.tv', '.anchor', function (e) {
		        var li = $(e.currentTarget).closest('li');
		        var $target = $(e.currentTarget);
		        var isCollapse = $target.hasClass(self.options.collapseIcon);
		        $target.toggleClass(self.options.expandIcon).toggleClass(self.options.collapseIcon).toggleClass('tv-collapse');
		        var node = li.data(internalDataKey);
		        if (node.children && node.children.length) {
		            $.each(node.children, function (i, c) {
		                _act(c, isCollapse);
		            });
		        }
		        function _act(root, visible) {
		            root.node[visible ? 'show' : 'hide']();
		            if (root.node.children('.anchor').hasClass(self.options.expandIcon) && root.children && root.children.length) {
		                $.each(root.children, function (k, m) {
		                    _act(m, visible);
		                });
		            }
		        }
		    });
		},
		_render: function () {
		    var levels = [];
		    var curLevel = 0;
		    var self = this;
		    function _renderNode(node) {
		            var data = {};
		            var li = $('<li></li>');
		            var text = '<span class="text {1}">{0}</span>', html = '';
		            // handle its children
		            var last, iter = 1, indentCount = levels[1] ? -1 : 0;
		            while (iter < curLevel) {
		                // print lines
		                while (iter < curLevel && levels[iter] === true) {
		                    indentCount+=2;
		                    iter++;
		                }
		                if (indentCount) html += '<span class="indent-{0}"></span>'.format(indentCount);
		                if (iter >= curLevel) break;
		                if (levels[iter] === false) {
		                    if (iter > 1) html += '<span class="indent-1"></span>';
		                    html += '<span class="v-line"></span>';
		                }
		                indentCount = 0;
		                iter++;
		            }
		            if (curLevel > 0) {
		                if (curLevel > 1) {
		                    html += '<span class="indent-{0}"></span>'.format(1);
		                }
		                html += '<span class="v-line {0}"></span>'.format(levels[curLevel] ? 'last-child' : '');
		            }
		            self.$element.append(li);
		            data.node = li;
		            if (node.children && node.children.length) {
		                curLevel++;
		                data.children = [];
		                text = '<span class="{0} anchor"></span>'.format(self.options.expandIcon) + text.format(node.text, '');
		                last = node.children.length - 1;
		                $.each(node.children, function (j, child) {
		                    levels[curLevel] = j == last;
		                    data.children.push(_renderNode(child));
		                });
		                curLevel--;
		            } else {
		                text = text.format(node.text, 'leaf');
		            }
		            if (curLevel > 0) html += '<span class="h-line"></span>';
		            html += text;
		            if (self.options.showTags) {
		                html += self.options.renderTag.call(self, self.options.tagTemplate, node.tag || '');
		            }
		            li.html(html);
		            if (self.options.itemRenderedCallback) self.options.itemRenderedCallback.call(self, { node: node, li: li });
		            li.data(internalDataKey, data);
		            return data;
		    }
		    this.root = _renderNode(this.tree);
		}
	};

	var logError = function(message) {
        if(window.console) {
            window.console.error(message);
        }
    };

	// Prevent against multiple instantiations,
	// handle updates and method calls
	$.fn[pluginName] = function(options, args) {
		return this.each(function() {
			var self = $.data(this, 'plugin_' + pluginName);
			if (typeof options === 'string') {
				if (!self) {
					logError('Not initialized, can not call method : ' + options);
				}
				else if (!$.isFunction(self[options]) || options.charAt(0) === '_') {
					logError('No such method : ' + options);
				}
				else {
					if (typeof args === 'string') {
						args = [args];
					}
					self[options].apply(self, args);
				}
			}
			else {
				if (!self) {
					$.data(this, 'plugin_' + pluginName, new Tree(this, $.extend(true, {}, options)));
				}
				else {
					self._init(options);
				}
			}
		});
	};

})(jQuery, window, document);
