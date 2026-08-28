import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core'
import { TranslatePipe } from '@ngx-translate/core'
import {
  DropdownSelectorComponent,
  DropdownChoice,
  ButtonComponent
} from 'geonetwork-ui'
import { Api } from '../../../core/api/api'
import {
  getJoinableColumnsIngestionIntegrityLinksIntegrityLinkIdJoinableColumnsGet,
  listJoinableTablesIngestionIntegrityLinksJoinableTablesGet
} from '../../../core/api/functions'
import type { Join, JoinColumn, JoinableTable } from '../../../core/api/models'

@Component({
  selector: 'app-join-config',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DropdownSelectorComponent, ButtonComponent, TranslatePipe],
  templateUrl: './join-config.component.html'
})
export class JoinConfigComponent {
  private api = inject(Api)

  sourceColumns = input<string[]>([])
  value = input<Join | null>(null)

  joinChanged = output<Join | null>()

  joinableTables = signal<JoinableTable[]>([])
  joinableColumns = signal<{ column_name: string }[]>([])

  selectedTableId = signal<string>('')
  selectedLeftColumn = signal<string>('')
  selectedRightColumn = signal<string>('')
  joinColumns = signal<JoinColumn[]>([])
  pendingColumn = signal<string>('')

  private initialized = signal(false)

  tableChoices = computed<DropdownChoice[]>(() => [
    { value: '', label: '-' },
    ...this.joinableTables().map((t) => ({
      value: t.id,
      label: t.integrity_title ?? t.table_name
    }))
  ])

  leftColumnChoices = computed<DropdownChoice[]>(() => [
    { value: '', label: '-' },
    ...this.sourceColumns().map((c) => ({ value: c, label: c }))
  ])

  rightColumnChoices = computed<DropdownChoice[]>(() => [
    { value: '', label: '-' },
    ...this.joinableColumns().map((c) => ({
      value: c.column_name,
      label: c.column_name
    }))
  ])

  availableOutputColumns = computed<DropdownChoice[]>(() => {
    const added = new Set(this.joinColumns().map((c) => c.column_name))
    return this.joinableColumns()
      .filter((c) => !added.has(c.column_name))
      .map((c) => ({ value: c.column_name, label: c.column_name }))
  })

  canAddColumn = computed(
    () =>
      !!this.selectedLeftColumn() &&
      !!this.selectedRightColumn() &&
      this.availableOutputColumns().length > 0
  )

  constructor() {
    this.loadJoinableTables()

    effect(() => {
      const val = this.value()
      if (val && !this.initialized()) {
        this.initialized.set(true)
        this.selectedTableId.set(val.table_id)
        this.selectedLeftColumn.set(val.left_column)
        this.selectedRightColumn.set(val.right_column)
        this.joinColumns.set(val.columns ?? [])
        this.loadJoinableColumns(val.table_id)
      }
    })
  }

  private async loadJoinableTables() {
    this.joinableTables.set(
      await this.api.invoke(
        listJoinableTablesIngestionIntegrityLinksJoinableTablesGet,
        {}
      )
    )
  }

  private async loadJoinableColumns(tableId: string) {
    this.joinableColumns.set(
      await this.api.invoke(
        getJoinableColumnsIngestionIntegrityLinksIntegrityLinkIdJoinableColumnsGet,
        { integrity_link_id: tableId }
      )
    )
  }

  selectTable(tableId: string) {
    this.selectedTableId.set(tableId)
    this.selectedRightColumn.set('')
    this.joinColumns.set([])
    this.joinableColumns.set([])
    this.pendingColumn.set('')
    if (tableId) {
      this.loadJoinableColumns(tableId)
    }
    this.emitChange()
  }

  selectLeftColumn(col: string) {
    this.selectedLeftColumn.set(col)
    this.emitChange()
  }

  selectRightColumn(col: string) {
    this.selectedRightColumn.set(col)
    this.emitChange()
  }

  selectPendingColumn(columnName: string) {
    this.pendingColumn.set(columnName)
  }

  confirmAddColumn() {
    const columnName = this.pendingColumn()
    if (!columnName) return
    if (this.joinColumns().some((c) => c.column_name === columnName)) return
    this.joinColumns.update((cols) => [...cols, { column_name: columnName }])
    this.pendingColumn.set('')
    this.emitChange()
  }

  removeColumn(columnName: string) {
    this.joinColumns.update((cols) =>
      cols.filter((c) => c.column_name !== columnName)
    )
    this.emitChange()
  }

  rowChoices(currentColumnName: string): DropdownChoice[] {
    return [
      { value: '', label: '-' },
      { value: currentColumnName, label: currentColumnName },
      ...this.availableOutputColumns()
    ]
  }

  onRowColumnChange(currentColumnName: string, newColumnName: string) {
    if (newColumnName === currentColumnName) return
    if (!newColumnName) {
      this.removeColumn(currentColumnName)
      return
    }
    this.joinColumns.update((cols) =>
      cols.map((c) =>
        c.column_name === currentColumnName ? { column_name: newColumnName } : c
      )
    )
    this.emitChange()
  }

  private emitChange() {
    const tableId = this.selectedTableId()
    const left = this.selectedLeftColumn()
    const right = this.selectedRightColumn()

    if (!tableId || !left || !right) {
      this.joinChanged.emit(null)
      return
    }

    this.joinChanged.emit({
      table_id: tableId,
      left_column: left,
      right_column: right,
      columns: this.joinColumns()
    })
  }
}
