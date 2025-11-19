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

import stringify from 'fast-safe-stringify';

export interface Options extends SpreadsheetOptions {
  height?: () => number;
  mode?: 'design' | 'write' | 'read';
}

class ControlData {
  key: keyof Cell = '';
  value: any;

  constructor (k: keyof Cell, v: any) { this.key = k; this.value = v; }
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
  sendCellControl: (data: string) => void = () => {}
  getDataFromCpp: () => SpreadsheetData = () => this.ss.data
  sendRange: (data: string) => void = () => {}

  constructor (el: HTMLElement, options: Options = {}) {
    this.bindEl = el
    this.options = Object.assign({mode: 'design'}, options)

    // clear content in el
    this.bindEl && (this.bindEl.innerHTML = '')

    this.ss = new Spreadsheet(options);
    this.ss.sendRange = (data) => this.sendRange(data)
    // console.log('::::>>>select:', this.ss.select)
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
    this.ss.getDataFromCpp = () => this.getDataFromCpp()

    let bodyHeightFn = (): number => {
      return 600
    }
    let bodyWidthFn = (): number => {
      return 800
    }
    this.table = new Table(this.ss, this.editorbar, Object.assign({height: bodyHeightFn, width: bodyWidthFn, mode: this.options.mode}));
    this.table.change = (data) => {
      this.toolbar && this.toolbar.setRedoAble(this.ss.isRedo())
      this.toolbar && this.toolbar.setUndoAble(this.ss.isUndo())
      this._change(data)
    }
    this.table.editorChange = (v) => this.editorChange(v)
    this.table.clickCell = (rindex, cindex, cell) => this.clickCell(rindex, cindex, cell)
    this.table.getDataFromCpp = () => this.getDataFromCpp()
    this.table.sendRange = (data) => this.sendRange(data)
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

  change (cb: (data: SpreadsheetData) => void): LocalSpreadsheet { // 얘는 콜백 지정일 뿐, 아래쪽 4개의 change에서 c++과 셀 데이터 동기화 필요
    this._change = cb
    return this;
  }

  private refreshEditor () {
    const td = this.table.td(this.ss.currentCellIndexes[0], this.ss.currentCellIndexes[1])
    this.table.editor && this.table.editor.setValue(this.ss.currentCell())
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

  private toolbarChange (k: keyof Cell, v: any) { // 툴바 관련 명령은 다 여기 거쳐서 감
    let JSControlData = new ControlData(k, v)
    
    this.sendCellControl(stringify(JSControlData))
    this.ss.data = this.getDataFromCpp()
    // this.table.editor && this.table.editor.setStyle(this.ss.currentCell())
    if (k === 'paintformat') {
      this.ss.copy()
      this.table.dashedSelector.set(this.table.selector);
      this.table.state = 'copyformat';
    }
    else if (k === "merge") this.table.selectorChange()
    this.table.reload()
    this.ss.change(this.ss.data)
    return
    // console.log('Cell: ', k)
    // console.log('any: ', v)
    if (k === 'merge') {
      this.table.merge();
      // console.log('merge')
      return;
    } else if (k === 'clearformat') {
      this.table.clearformat();
      // console.log('clearformat')
      return ;
    } else if (k === 'paintformat') {
      this.table.copyformat();
      // console.log('paintformat')
      return ;
    }
    // console.log('setCellAttr')
    this.table.setCellAttr(k, v)
  }

  private editorbarChange (v: Cell) { // 위쪽의 입력바를 눌러서 수행하는 모든 입력에 대해서 처리하는 부분
    // console.log('Cell: ', v)
    // console.log('editorbarChange')
    let JSControlData = new ControlData('text', v["text"])
    this.sendCellControl(stringify(JSControlData))
    this.ss.data = this.getDataFromCpp()
    // this.table.reload()
    this.ss.change(this.ss.data)
    this.refreshEditor()
    this.table.editor && this.table.editor.setStyle(this.ss.currentCell())
    return
    this.table.setValueWithText(v) // 여기서 히스토리 저장함 table에서 
  }

  private editorChange (v: Cell) { // 셀을 눌러서 수행하는 모든 입력에 대해서 처리하는 부분
    // console.log('Cell: ', v)
    // console.log('editorChange')
    let JSControlData = new ControlData('text', v["text"]);
    this.sendCellControl(stringify(JSControlData));
    this.ss.data = this.getDataFromCpp()
    this.table.editor && this.table.editor.setStyle(this.ss.currentCell())
    this.editorbar && this.editorbar.setValue(v)
    return
  }

  private clickCell (rindex: number, cindex: number, v: Cell | null) { // 셀 편집 관련 다 여기 거쳐서 감
    // console.log('rindex: ', rindex, ', cindex: ', cindex)
    // console.log('Cell: ', v)
    // console.log('clickCell')
    const cols = this.ss.cols()
    this.editorbar && this.editorbar.set(`${cols[cindex].title}${rindex + 1}`, v)
    this.toolbar && this.toolbar.set(this.table.td(rindex, cindex), v)
  }

}
