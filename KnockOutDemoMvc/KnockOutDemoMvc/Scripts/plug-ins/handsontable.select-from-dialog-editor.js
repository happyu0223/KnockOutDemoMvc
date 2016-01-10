
(function (Handsontable) {
    var SelectFromDialogEditor = Handsontable.editors.BaseEditor.prototype.extend();

    SelectFromDialogEditor.prototype.init = function () {
        var that = this;
        this.createElements();
        this.eventManager = new Handsontable.eventManager(this);
        this.bindEvents();
        this.__value__ = null;
        this._modalSelector = '#SelectCardCodeDialog';

        this.instance.addHook('afterDestroy', function () {
            that.destroy();
        });
    };

    SelectFromDialogEditor.prototype.getValue = function () {
        return this.__value__;
    };

    SelectFromDialogEditor.prototype.setValue = function (newValue) {
        this.__value__ = newValue;
    };

    SelectFromDialogEditor.prototype.open = function () {
        this.refreshDimensions();
        $(this._modalSelector).data('cell-pos', [this.col, this.row]);
        $(this._modalSelector).modal('show');
    };

    SelectFromDialogEditor.prototype.close = function () {
        //$(this._modalSelector).modal('hide');
    };

    SelectFromDialogEditor.prototype.focus = function () {
        // nothing to do
    };

    SelectFromDialogEditor.prototype.createElements = function () {
        // nothing to create
    };

    SelectFromDialogEditor.prototype.checkEditorSection = function () {
        if (this.row < this.instance.getSettings().fixedRowsTop) {
            if (this.col < this.instance.getSettings().fixedColumnsLeft) {
                return 'corner';
            } else {
                return 'top';
            }
        } else {
            if (this.col < this.instance.getSettings().fixedColumnsLeft) {
                return 'left';
            }
        }
    };

    SelectFromDialogEditor.prototype.getEditedCell = function () {
        var editorSection = this.checkEditorSection()
          , editedCell;

        switch (editorSection) {
            case 'top':
                editedCell = this.instance.view.wt.wtScrollbars.vertical.clone.wtTable.getCell({ row: this.row, col: this.col });
                break;
            case 'corner':
                editedCell = this.instance.view.wt.wtScrollbars.corner.clone.wtTable.getCell({ row: this.row, col: this.col });
                break;
            case 'left':
                editedCell = this.instance.view.wt.wtScrollbars.horizontal.clone.wtTable.getCell({ row: this.row, col: this.col });
                break;
            default:
                editedCell = this.instance.getCell(this.row, this.col);
                break;
        }

        return editedCell != -1 && editedCell != -2 ? editedCell : void 0;
    };


    SelectFromDialogEditor.prototype.refreshDimensions = function () {
        if (this.state !== Handsontable.EditorState.EDITING) {
            return;
        }
        // nothing to do
    };

    SelectFromDialogEditor.prototype.bindEvents = function () {
        var editor = this;
        this.instance.addHook('afterDestroy', function () {
            editor.eventManager.clear();
        });
    };

    SelectFromDialogEditor.prototype.destroy = function () {
        this.eventManager.clear();
    };


    Handsontable.editors.SelectFromDialogEditor = SelectFromDialogEditor;
    Handsontable.editors.registerEditor('select-from-dialog', Handsontable.editors.SelectFromDialogEditor);

    Handsontable.SelectFromDialogCell = {
        editor: Handsontable.editors.SelectFromDialogEditor,
        renderer: Handsontable.renderers.TextRenderer
    };
    Handsontable.cellTypes.selectfromdialog = Handsontable.SelectFromDialogCell;

})(Handsontable);