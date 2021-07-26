import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {VirtualAssistantComponent} from './virtual-assistant.component';
import {VirtualAssistantRoutingModule} from './virtual-assistant-routing.module';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatGridListModule} from '@angular/material/grid-list';
import {ScrollingModule} from '@angular/cdk/scrolling';
import { VaConversationComponent } from './va-conversation/va-conversation.component';
import {ConversationHeaderComponent} from './va-conversation/conversation-header/conversation-header.component';
import {ConversationMessageComponent} from './va-conversation/conversation-message/conversation-message.component';
import {ConversationFooterComponent} from './va-conversation/conversation-footer/conversation-footer.component';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSelectModule} from '@angular/material/select';
import {ReactiveFormsModule} from '@angular/forms';

@NgModule({
  declarations: [VirtualAssistantComponent,
    VaConversationComponent,
    ConversationHeaderComponent,
    ConversationMessageComponent,
    ConversationFooterComponent],
  imports: [
    CommonModule,
    VirtualAssistantRoutingModule,
    MatIconModule,
    MatButtonModule,
    MatGridListModule,
    ScrollingModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  exports: [VirtualAssistantComponent]
})
export class VirtualAssistantModule { }
