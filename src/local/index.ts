import { Spreadsheet, SpreadsheetOptions, SpreadsheetData } from '../core/index'
import '../style/index.less'
import { Cell, getStyleFromCell } from '../core/cell';
import { Format } from '../core/format';
import { Font } from '../core/font';
import { Editor } from './editor';
import { Selector } from './selector';
import { Table } from './table';
import { Toolbar } from './toolbar';
import { Editorbar } from './editorbar';
import { h, Element } from './base/element'

export interface Options extends SpreadsheetOptions {
  height?: () => number;
  mode?: 'design' | 'write' | 'read';
}

export class LocalSpreadsheet {
  ss: Spreadsheet;
  refs: {[key: string]: HTMLElement} = {};
  table: Table;
  toolbar: Toolbar | null = null;
  editorbar: Editorbar | null = null;

  bindEl: HTMLElement
  options: Options;

  _change: (data: SpreadsheetData) => void = () => {}

  constructor (el: HTMLElement, options: Options = {}) {
    this.bindEl = el
    this.options = Object.assign({mode: 'design'}, options)

    // clear content in el
    this.bindEl && (this.bindEl.innerHTML = '')

    this.ss = new Spreadsheet(options);
    // console.log('::::>>>select:', this.ss.select)
    if (this.options.mode === 'design') {
      this.editorbar = new Editorbar()
      this.editorbar.change = (v) => this.editorbarChange(v)

      this.toolbar = new Toolbar(this.ss);
      this.toolbar.change = (key, v) => this.toolbarChange(key, v)
      // console.log("Toolbar: ", this.toolbar)
      this.toolbar.undo = () => {
        // console.log('undo::')
        return this.table.undo()
      }
      this.toolbar.redo = () => {
        // console.log('redo::')
        return this.table.redo()
      }
    }

    let bodyHeightFn = (): number => {
      return 600
    }
    let bodyWidthFn = (): number => {
      return 800
    }
    this.table = new Table(this.ss, Object.assign({height: bodyHeightFn, width: bodyWidthFn, mode: this.options.mode}));
    this.table.change = (data) => {
      this.toolbar && this.toolbar.setRedoAble(this.ss.isRedo())
      this.toolbar && this.toolbar.setUndoAble(this.ss.isUndo())
      this._change(data)
    }
    this.table.editorChange = (v) => this.editorChange(v)
    this.table.clickCell = (rindex, cindex, cell) => this.clickCell(rindex, cindex, cell)
    this.render();
  }

  loadData (data: SpreadsheetData): LocalSpreadsheet { // 파일 읽어오고 나서 여기로 전달하면 데이터 저장 가능
    // reload until waiting main thread
    setTimeout(() => {
      this.ss.data = data
      this.table.reload()
    }, 1)
    return this
  }

  change (cb: (data: SpreadsheetData) => void): LocalSpreadsheet { // 이 change에서 cb을 저장해두고 c++로 데이터 보낸 다음 받아와서 cb 호출하면 되는 부분?!
    this._change = cb
    return this;
  }

  private render (): void {
    this.bindEl.appendChild(h().class('spreadsheet').children([
      h().class('spreadsheet-bars').children([
        this.toolbar && this.toolbar.el || '',
        this.editorbar && this.editorbar.el || '',
      ]),
      this.table.el
    ]).el);
  }

  private toolbarChange (k: keyof Cell, v: any) {
    if (k === 'merge') {
      this.table.merge();
      console.log('merge')
      console.log('LocalSpreadSheet: ', this)
      console.log('Cell: ', k)
      console.log('any: ', v)
      return;
    } else if (k === 'clearformat') {
      this.table.clearformat();
      console.log('clearformat')
      console.log('LocalSpreadSheet: ', this)
      console.log('Cell: ', k)
      console.log('any: ', v)
      return ;
    } else if (k === 'paintformat') {
      this.table.copyformat();
      console.log('paintformat')
      console.log('LocalSpreadSheet: ', this)
      console.log('Cell: ', k)
      console.log('any: ', v)
      return ;
    }
    console.log('setCellAttr')
    console.log('LocalSpreadSheet: ', this)
    console.log('Cell: ', k)
    console.log('any: ', v)
    this.table.setCellAttr(k, v);
  }

  private editorbarChange (v: Cell) {
    console.log('editorbarChange')
    console.log('LocalSpreadSheet: ', this)
    console.log('Cell: ', v)
    this.table.setValueWithText(v)
  }

  private editorChange (v: Cell) {
    console.log('editorChange')
    console.log('LocalSpreadSheet: ', this)
    console.log('Cell: ', v)
    this.editorbar && this.editorbar.setValue(v)
  }

  private clickCell (rindex: number, cindex: number, v: Cell | null) {
    console.log('clickCell')
    console.log('LocalSpreadSheet: ', this)
    console.log('rindex: ', rindex, ', cindex: ', cindex)
    console.log('Cell: ', v)
    const cols = this.ss.cols()
    this.editorbar && this.editorbar.set(`${cols[cindex].title}${rindex + 1}`, v)
    this.toolbar && this.toolbar.set(this.table.td(rindex, cindex), v)
  }

}
