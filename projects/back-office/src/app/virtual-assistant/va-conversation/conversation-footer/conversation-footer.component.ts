import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';

@Component({
  selector: 'app-conversation-footer',
  templateUrl: './conversation-footer.component.html',
  styleUrls: ['./conversation-footer.component.scss']
})

export class ConversationFooterComponent implements OnInit, OnChanges {

  @Output() btnSendClick: EventEmitter<any> = new EventEmitter();
  @Output() btnRecClick: EventEmitter<any> = new EventEmitter();

  @Output() inputChange: EventEmitter<any> = new EventEmitter();

  public input: any;
  public btnSend: any;
  public btnRec: any;

  @Input() inputValue = '';
  @Input() inputType = '';

  ngOnChanges(changes: SimpleChanges): void {
    // we skip that at the beginning when object are not yet set
    if (this.input !== undefined && changes.inputValue !== undefined){
      console.log('ngOnChanges : ' + this.inputValue);
      this.input.value = null;
      console.log('this.input.value : ' + this.input.value);
      console.log('changes.inputValue.currentValue : ' + changes.inputValue.currentValue);
      console.log('this.inputValue : ' + this.inputValue);
      console.log('this.inputType : ' + this.inputType);
      console.log('this.input.value : ' + this.input.value);
      if (changes.inputValue.currentValue === '' && this.inputValue !== ''){
        // this.msgChange(this.inputValue);
      }
      else if (changes.inputValue.currentValue !== ''){
        this.msgChange(changes.inputValue.currentValue);
      }
      this.input.focus();
    }
  }

  constructor() {
  }

  ngOnInit(): void {
    this.input = document.getElementById('inputMsg');
    this.btnSend = document.getElementById('btnSend');
    this.btnRec = document.getElementById('btnRec');
  }

  inputFocus(): void {
    this.input.focus();
  }

  msgChange(text: string): void {
    this.inputChange.emit(text);
  }
}
