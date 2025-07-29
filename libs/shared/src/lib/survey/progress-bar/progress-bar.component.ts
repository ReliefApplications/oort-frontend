import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { AngularComponentFactory } from 'survey-angular-ui';
import { SurveyModel, Question } from 'survey-core';
import { CommonModule } from '@angular/common';
import { getVisibleQuestions } from '../../services/form-builder/form-builder.service';

/** Percentage bar for the forms*/
@Component({
  selector: 'sv-ng-progress-buttons',
  templateUrl: './progress-bar.component.html',
  imports: [CommonModule],
  standalone: true,
  styleUrls: ['./progress-bar.component.scss'],
})
export class ProgressBarComponent implements OnInit {
  /** Current survey model */
  @Input() model!: SurveyModel;
  /** Current page required questions */
  public currentPageRequiredQuestions: Question[] = [];
  /** Progress bar percentage value */
  public value = 0;
  /** Title shown above percentage */
  public title = '';

  /**
   * Percentage progress bar for the forms
   *
   * @param cdr Angular change detector ref
   */
  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.title = this.model.data.form_and_br;
    // isRequiredCpy is declared in the form builder service, and copy the isRequired property of the question we build when using skipRequiredValidation
    const updateCurrentPageQuestions = () => {
      this.currentPageRequiredQuestions = getVisibleQuestions(
        this.model.currentPage.questions
      ).filter((q) => q.isRequired || q.isRequiredCpy);
      this.updateValue();
    };
    updateCurrentPageQuestions();
    this.model.onCurrentPageChanged.add(updateCurrentPageQuestions);
    this.model.onDynamicPanelAdded.add(updateCurrentPageQuestions);
    this.model.onDynamicPanelRemoved.add(updateCurrentPageQuestions);

    this.model.onValueChanged.add(() => {
      this.updateValue();
    });
  }

  /**
   * Updates percentage value
   */
  private updateValue() {
    this.value =
      (this.currentPageRequiredQuestions.filter(
        (question: Question) => !question.isEmpty()
      ).length *
        100) /
      this.currentPageRequiredQuestions.length;

    this.cdr.detectChanges();
  }
}

AngularComponentFactory.Instance.registerComponent(
  'sv-progressbar-percentage',
  ProgressBarComponent
);
