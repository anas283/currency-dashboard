import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavBarComponent } from './ui/nav-bar/nav-bar.component';
import { FooterComponent } from './ui/footer/footer.component';
import { RealtimeService } from './core/services/realtime.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavBarComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly _ = inject(RealtimeService);
}
