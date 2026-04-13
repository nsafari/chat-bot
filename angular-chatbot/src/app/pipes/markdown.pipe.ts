import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const rendered = marked.parse(value, {
      gfm: true,
      breaks: true
    });

    return typeof rendered === 'string' ? rendered : '';
  }
}
