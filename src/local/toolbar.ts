import { Element, h } from "./base/element";
import { Spreadsheet } from "../core/index";
import { Cell, getStyleFromCell, defaultCell } from '../core/cell';
import { Table } from './table';
import { buildItem, Item } from './base/item';
import { buildIcon } from './base/icon';
import { buildDropdown, Dropdown } from './base/dropdown';
import { buildMenu } from './base/menu';
import { buildColorPanel } from './base/colorPanel';
import { Font } from "../core/font";
import { Format } from "../core/format";

export class Toolbar {
  el: Element;
  defaultCell: Cell;

  target: Element | null = null;
  currentCell: Cell | null = null;

  elUndo: Element;
  elRedo: Element;
  elPaintformat: Element;
  elClearformat: Element;
  elFormat: Dropdown;
  elFont: Dropdown;
  elFontSize: Dropdown;
  elFontWeight: Element;
  elFontStyle: Element;
  elTextDecoration: Element;
  elColor: Dropdown;
  elBackgroundColor: Dropdown;
  elMerge: Element;
  elAlign: Dropdown;
  elValign: Dropdown;
  elWordWrap: Element;

  change: (key: keyof Cell, v: any) => void = (key, v) => {}
  redo: () => boolean = () => false
  undo: () => boolean = () => false

  constructor (public ss: Spreadsheet) {
    this.defaultCell = ss.data.cell

    this.el = h().class('spreadsheet-toolbar').child(
        buildMenu('horizontal').children([
          this.elUndo = this.buildUndo(),
          this.elRedo = this.buildRedo(),
          this.elPaintformat = this.buildPaintformat(),
          this.elClearformat = this.buildClearformat(),
          this.elFormat = this.buildFormats(),
          this.buildSeparator(),
          this.elFont = this.buildFonts(),
          this.elFontSize = this.buildFontSizes(),
          this.buildSeparator(),
          this.elFontWeight = this.buildFontWeight(),
          this.elFontStyle = this.buildFontStyle(),
          this.elTextDecoration = this.buildTextDecoration(),
          this.elColor = this.buildColor(),
          this.buildSeparator(),
          this.elBackgroundColor = this.buildBackgroundColor(),
          this.elMerge = this.buildMerge(),
          this.buildSeparator(),
          this.elAlign = this.buildAligns(),
          this.elValign = this.buildValigns(),
          this.elWordWrap = this.buildWordWrap()
        ])
      )
    ;
  }

  set (target: Element, cell: Cell | null) {
    console.log('src/local/toolbar.ts - set')
    this.target = target
    this.setCell(cell)
  }

  private setCell (cell: Cell | null) {
    console.log('src/local/toolbar.ts - setCell')
    this.currentCell = cell
    this.setCellStyle()
  }

  private setCellStyle () {
    console.log('src/local/toolbar.ts - setCellStyle')
    const { target, currentCell, defaultCell, ss } = this
    // console.log(':::', currentCell)
    if (target) {
      // target.clearStyle()
      // target.styles(getStyleFromCell(currentCell))
      this.elFormat.title.html(ss.getFormat(currentCell !== null && currentCell.format || defaultCell.format).title);
      this.elFont.title.html(ss.getFont(currentCell !== null && currentCell.font || defaultCell.font).title);
      this.elFontSize.title.html((currentCell !== null && currentCell.fontSize || defaultCell.fontSize) + '');
      this.elFontWeight.active(currentCell !== null && currentCell.bold !== undefined && currentCell.bold !== defaultCell.bold);
      this.elFontStyle.active(currentCell !== null && currentCell.italic !== undefined && currentCell.italic !== defaultCell.italic);
      this.elTextDecoration.active(currentCell !== null && currentCell.underline !== undefined && currentCell.underline !== defaultCell.underline);
      this.elColor.title.style('border-bottom-color', currentCell !== null && currentCell.color || defaultCell.color);
      this.elBackgroundColor.title.style('border-bottom-color', currentCell !== null && currentCell.backgroundColor || defaultCell.backgroundColor);
      (<any>this.elAlign.title).replace(`align-${currentCell !== null && currentCell.align || defaultCell.align}`);
      (<any>this.elValign.title).replace(`valign-${currentCell !== null && currentCell.valign || defaultCell.valign}`);
      this.elWordWrap.active(currentCell !== null && currentCell.wordWrap !== undefined && currentCell.wordWrap !== defaultCell.wordWrap);
      // console.log('select:', currentCell)
      if ((currentCell !== null && currentCell.rowspan && currentCell.rowspan > 1)
        || (currentCell !== null && currentCell.colspan && currentCell.colspan > 1)) {
        this.elMerge.active(true);
      } else {
        this.elMerge.active(false);
      }
    }
  }

  setRedoAble (flag: boolean) {
    console.log('src/local/toolbar.ts - setRedoAble')
    flag ? this.elRedo.able() : this.elRedo.disabled()
  }

  setUndoAble (flag: boolean) {
    console.log('src/local/toolbar.ts - setUndoAble')
    flag ? this.elUndo.able() : this.elUndo.disabled()
  }

  private buildSeparator (): Element {
    console.log('src/local/toolbar.ts - buildSeparator')
    return h().class('spreadsheet-item-separator')
  }
  private buildAligns (): Dropdown {
    console.log('src/local/toolbar.ts - buildAligns')
    const titleIcon = buildIcon(`align-${this.defaultCell.align}`)
    const clickHandler = (it: string) => {
      console.log('src/local/toolbar.ts - clickHandler')
      titleIcon.replace(`align-${it}`)
      this.change('align', it)
    }
    return buildDropdown(titleIcon, '60px', [buildMenu().children(
      ['left', 'center', 'right'].map(it => 
        buildItem()
          .child(buildIcon(`align-${it}`).style('text-align', 'center'))
          .on('click', clickHandler.bind(null, it))
      )
    )])
  }
  private buildValigns (): Dropdown {
    console.log('src/local/toolbar.ts - buildValigns')
    const titleIcon = buildIcon(`valign-${this.defaultCell.valign}`)
    const clickHandler = (it: string) => {
      console.log('src/local/toolbar.ts - clickHandler')
      titleIcon.replace(`valign-${it}`)
      this.change('valign', it)
    }
    return buildDropdown(titleIcon, '60px', [buildMenu().children(
      ['top', 'middle', 'bottom'].map(it => 
        buildItem()
          .child(buildIcon(`valign-${it}`).style('text-align', 'center'))
          .on('click', clickHandler.bind(null, it))
        )
    )])
  }
  private buildWordWrap (): Element {
    console.log('src/local/toolbar.ts - buildWordWrap')
    return buildIconItem('textwrap', (is) => this.change('wordWrap', is))
  }
  private buildFontWeight (): Element {
    console.log('src/local/toolbar.ts - buildFontWeight')
    return buildIconItem('bold', (is) => this.change('bold', is))
  }
  private buildFontStyle (): Element {
    console.log('src/local/toolbar.ts - buildFontStyle')
    return buildIconItem('italic', (is) => this.change('italic', is))
  }
  private buildTextDecoration (): Element {
    console.log('src/local/toolbar.ts - buildTextDecoration')
    return buildIconItem('underline', (is) => this.change('underline', is))
  }
  private buildMerge (): Element {
    console.log('src/local/toolbar.ts - buildMerge')
    return buildIconItem('merge', (is) => this.change('merge', is))
  }
  private buildColor (): Dropdown {
    console.log('src/local/toolbar.ts - buildColor')
    const clickHandler = (color: string) => {
      console.log('src/local/toolbar.ts - clickHandler')
      this.elColor.title.style('border-bottom-color', color)
      this.change('color', color)
    }
    return buildDropdown(
      buildIcon('text-color').styles({'border-bottom': `3px solid ${this.defaultCell.color}`, 'margin-top': '2px', height: '16px'}),
      'auto',
      [buildColorPanel(clickHandler)])
  }
  private buildBackgroundColor (): Dropdown {
    console.log('src/local/toolbar.ts - buildBackgroundColor')
    const clickHandler = (color: string) => {
      console.log('src/local/toolbar.ts - clickHandler')
      this.elBackgroundColor.title.style('border-bottom-color', color)
      this.change('backgroundColor', color)
    }
    return buildDropdown(
      buildIcon('cell-color').styles({'border-bottom': `3px solid ${this.defaultCell.backgroundColor}`, 'margin-top': '2px', height: '16px'}),
      'auto',
      [buildColorPanel(clickHandler)])
  }
  private buildUndo (): Element {
    console.log('src/local/toolbar.ts - buildUndo')
    return buildItem().child(buildIcon('undo'))
      .on('click', (evt) => {
        console.log('src/local/toolbar.ts - on')
        // console.log('toolbar.ts - buildUndo()')
        // console.log('evt: ', evt)
        this.undo() ? this.elUndo.able() : this.elUndo.disabled()
      })
      .disabled()
  }
  private buildRedo (): Element {
    console.log('src/local/toolbar.ts - buildRedo')
    return buildItem().child(buildIcon('redo'))
      .on('click', (evt) => {
        console.log('src/local/toolbar.ts - on')
        // console.log('toolbar.ts - buildRedo()')
        // console.log('evt: ', evt)
        this.redo() ? this.elRedo.able() : this.elRedo.disabled()
      })
      .disabled()
  }
  private buildPaintformat (): Element {
    console.log('src/local/toolbar.ts - buildPaintformat')
    return buildIconItem('paintformat', (is) => { 
      console.log('src/local/toolbar.ts - buildIconItem')
      this.change('paintformat', true);
      this.elPaintformat.deactive();
    })
  }
  private buildClearformat (): Element {
    console.log('src/local/toolbar.ts - buildClearformat')
    return buildIconItem('clearformat', (is) => { 
      console.log('src/local/toolbar.ts - buildIconItem')
      this.change('clearformat', true);
      this.elClearformat.deactive();
    });
  }
  private buildFormats (): Dropdown {
    console.log('src/local/toolbar.ts - buildFormats')
    const clickHandler = (it: Format) => {
      console.log('src/local/toolbar.ts - clickHandler')
      this.elFormat.title.html(this.ss.getFormat(it.key).title);
      this.change('format', it.key)
    }
    return buildDropdown(this.ss.getFormat(this.defaultCell.format).title, '250px', [buildMenu().children(
      this.ss.formats.map(it => 
        buildItem()
          .children([it.title, h().class('label').child(it.label||'')])
          .on('click', clickHandler.bind(null, it))
        )
    )])
  }
  private buildFonts (): Dropdown {
    console.log('src/local/toolbar.ts - buildFonts')
    const clickHandler = (it: Font) => {
      console.log('src/local/toolbar.ts - clickHandler')
      this.elFont.title.html(it.title)
      this.change('font', it.key)
    }
    return buildDropdown(this.ss.getFont(this.defaultCell.font).title, '170px', [buildMenu().children(
      this.ss.fonts.map(it => { 
        return buildItem()
          .child(it.title)
          .on('click', clickHandler.bind(null, it))
      })
    )])
  }
  private buildFontSizes (): Dropdown {
    console.log('src/local/toolbar.ts - buildFontSizes')
    const clickHandler = (it: number) => {
      console.log('src/local/toolbar.ts - clickHandler')
      this.elFontSize.title.html(`${it}`)
      this.change('fontSize', it)
    }
    return buildDropdown(this.defaultCell.fontSize + '', '70px', [buildMenu().children(
      [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 30, 36].map(it => {
        return buildItem()
          .child(`${it}`)
          .on('click', clickHandler.bind(null, it))
      })
    )])
  }
}

const buildIconItem = (iconName: string, change: (flag: boolean) => void) => {
  console.log('src/local/toolbar.ts - buildIconItem')
  const el = buildItem().child(buildIcon(iconName))
  el.on('click', (evt) => {
    console.log('src/local/toolbar.ts - on')
    let is = el.isActive()
    is ? el.deactive() : el.active()
    change(!is)
  })
  return el;
}