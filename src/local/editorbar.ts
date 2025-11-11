import { Element, h } from "./base/element";
import { Cell } from "../core/cell";
import { mouseMoveUp } from "./event"

export class Editorbar {
  el: Element;
  value: Cell | null = null; // 选中的当前的cell
  textarea: Element;
  label: Element;
  change: (v: Cell) => void = (v) => {};
  constructor () {
    this.el = h().class('spreadsheet-editor-bar').children([
      h().class('spreadsheet-formula-bar').children([
        this.label = h().class('spreadsheet-formula-label'),
        this.textarea = h('textarea').on('input', (evt) => this.input(evt))
      ]),
      // h().class('spreadsheet-formular-bar-resizer').on('mousedown', this.mousedown)
    ])
  }

  set (title: string, value: Cell | null) {
    console.log('src/local/editorbar.ts - set')
    this.label.html(title)
    this.setValue(value)
  }

  setValue (value: Cell | null) {
    console.log('src/local/editorbar.ts - setValue')
    this.value = value
    this.textarea.val(value && value.text || '')
  }

  input (evt: any) {
    console.log('src/local/editorbar.ts - input')
    const v = evt.target.value
    
    if (this.value) {
      this.value.text = v
    } else {
      this.value = {text: v}
    }
    // console.log('editorbar - input()')
    // console.log('event:', evt)
    this.change(this.value)
  }

}