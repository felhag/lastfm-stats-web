import { Directive, ElementRef, Input, inject } from '@angular/core';
import { AbstractChart } from '../charts/abstract-chart';

@Directive({
    selector: '[chartLoader]',
})
export class ChartLoaderDirective {
    private el = inject(ElementRef);

    @Input()
    set chart(chart: AbstractChart) {
        chart.register(this.el.nativeElement);
    }
}
