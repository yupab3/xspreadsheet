import { Spreadsheet, SpreadsheetOptions, SpreadsheetData } from '../core/index'
import '../style/index.less'
import { Cell, getStyleFromCell } from '../core/cell';
import { Format } from '../core/format';
import { Font } from '../core/font';
import { Editor } from './editor';
import { Selector } from './selector';
import { Select } from '../core/select';
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
  inputRow: number;
  inputCol: number;
  inputData: string;
  modeInput: boolean;
  _change: (data: SpreadsheetData) => void = () => {}
  sendCellControl: (data: string) => string = () => { return "" }
  getDataFromCpp: () => SpreadsheetData = () => this.ss.data

  constructor (el: HTMLElement, options: Options = {}) {
    this.bindEl = el
    this.modeInput = false;
    this.inputRow = 0;
    this.inputCol = 0;
    this.inputData = '';
    this.options = Object.assign({mode: 'design'}, options)

    // clear content in el
    this.bindEl && (this.bindEl.innerHTML = '')

    this.ss = new Spreadsheet(options);
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
      return 1200
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
    this.table.refreshToolbar = () => this.refreshToolbar()
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

  refreshToolbar () {
    const [rindex, cindex] = this.ss.currentCellIndexes
    const c = this.ss.currentCell()
    if (c) this.toolbar && this.toolbar.set(this.table.td(rindex, cindex), c)
    else this.toolbar && this.toolbar.set(this.table.td(rindex, cindex), this.ss.data.cell)
    this.toolbar?.setRedoAble(this.ss.isRedo())
    this.toolbar?.setUndoAble(this.ss.isUndo())
  }

  private refreshEditor (v: Cell) {
    if (this.ss.currentCellIndexes) {
      if (this.editorbar) this.editorbar.setValue(v)
    }
    this.table.editor && this.table.editor.setValue(v)
    this.table.editor && this.table.editor.setStyle(this.ss.currentCell())
    let [r, c] = this.ss.currentCellIndexes
    this.table.reRenderCell(r, c)
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

  private setInputMode(v: Cell) {
    let [r, c] = this.ss.currentCellIndexes
    this.modeInput = true;
    this.inputRow = r
    this.inputCol = c
    this.table.reRenderCell(r, c)
    this.inputData = v['text'] ?? ""
  }

  private toolbarChange (k: keyof Cell, v: any) { // 툴바 관련 명령은 다 여기 거쳐서 감
    let JSControlData = new ControlData(k, v)
    
    // console.log('toolbarChange')
    console.time("cppJob");
    let rt = JSON.parse(this.sendCellControl(stringify(JSControlData)));
    this.ss.data = this.getDataFromCpp()
    console.timeEnd("cppJob");
    // this.table.editor && this.table.editor.setStyle(this.ss.currentCell())
    console.time("JSJob");
    if (k === 'paintformat') {
      this.ss.copy()
      this.table.dashedSelector.set(this.table.selector);
      this.table.state = 'copyformat';
    }
    else if (k === "merge") {
      if (this.ss.select) this.ss.select.canMerge = !this.ss.select.canMerge
      this.table.selectorChange()
    }
    if (rt) {
      for (const [r, c] of rt.trgt) {
        this.table.reRenderCell(r, c)
      }
    }
    // this.table.editor && this.table.editor.setStyle(this.ss.currentCell())
    // this.editorbar && this.editorbar.setValue(this.ss.currentCell())
    this.refreshToolbar()
    // this.ss.change(this.ss.data)
    console.timeEnd("JSJob");
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
    this.table.setCellAttr(k, v)
  }

  private editorbarChange (v: Cell) { // 위쪽의 입력바를 눌러서 수행하는 모든 입력에 대해서 처리하는 부분
    // console.log('Cell: ', v)
    // console.log('editorbarChange')
    // let JSControlData = new ControlData('text', v["text"])
    // this.sendCellControl(stringify(JSControlData))
    // this.ss.data = this.getDataFromCpp()
    // this.table.reload()
    this.setInputMode(v)
    this.refreshEditor(v)
    return
    this.table.setValueWithText(v) // 여기서 히스토리 저장함 table에서 
  }

  private editorChange (v: Cell) { // 셀을 눌러서 수행하는 모든 입력에 대해서 처리하는 부분
    // console.log('Cell: ', v)
    // console.log('editorChange')
    // let JSControlData = new ControlData('text', v["text"]);
    // this.sendCellControl(stringify(JSControlData));
    // this.ss.data = this.getDataFromCpp()
    this.setInputMode(v)
    this.table.editor && this.table.editor.setStyle(this.ss.currentCell())
    this.editorbar && this.editorbar.setValue(v)
    return
  }

  private clickCell (rindex: number, cindex: number, v: Cell | null) { // 셀 편집 관련 다 여기 거쳐서 감
    // console.log('rindex: ', rindex, ', cindex: ', cindex)
    // console.log('Cell: ', v)
    // console.log('clickCell')
    if (this.modeInput) {
      let tmpSelect = new Select([this.inputRow, this.inputCol], [this.inputRow, this.inputCol], false)
      this.table.sendRange(stringify(tmpSelect))
      let JSControlData = new ControlData('text', this.inputData)
      let rt = JSON.parse(this.sendCellControl(stringify(JSControlData)))
      this.ss.data = this.getDataFromCpp()
      this.modeInput = false
      let renderRow
      let renderCol
      if (rt) {
        for (const [r, c] of rt.trgt) {
          this.table.reRenderCell(r, c)
          renderRow = r;
          renderCol = c;
        }
      }
      this.table.editor && this.table.editor.setValue(this.ss.getCell(renderRow, renderCol))
    }
    const cols = this.ss.cols()
    this.editorbar && this.editorbar.set(`${cols[cindex].title}${rindex + 1}`, v)
    this.refreshToolbar();
  }
}
