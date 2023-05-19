import { Directive, ElementRef, Input } from '@angular/core';
import { AbstractChart } from '../charts/abstract-chart';

@Directive({
    selector: '[chartLoader]',
    standalone: true
})
export class ChartLoaderDirective {
    constructor(private el: ElementRef) { }

    @Input()
    set chart(chart: AbstractChart) {
        chart.register(this.el.nativeElement);
    }
}