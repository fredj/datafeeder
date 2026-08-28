import { provideHttpClient } from '@angular/common/http'
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TranslateModule } from '@ngx-translate/core'
import { provideApiConfiguration } from '../../../core/api/api-configuration'
import type {
  Join,
  JoinableColumn,
  JoinableTable
} from '../../../core/api/models'
import { JoinConfigComponent } from './join-config.component'

describe('JoinConfigComponent', () => {
  let component: JoinConfigComponent
  let fixture: ComponentFixture<JoinConfigComponent>
  let httpMock: HttpTestingController

  const tables: JoinableTable[] = [
    { id: 'table-1', integrity_title: 'Postal codes', table_name: 'stg_1' },
    { id: 'table-2', integrity_title: null, table_name: 'stg_2' }
  ]
  const columns: JoinableColumn[] = [
    { column_name: 'city' },
    { column_name: 'region' }
  ]

  async function flushTablesRequest() {
    httpMock
      .expectOne('/test/ingestion/integrity-links/joinable-tables')
      .flush(tables)
    await fixture.whenStable()
  }

  async function flushColumnsRequest(tableId: string) {
    httpMock
      .expectOne(`/test/ingestion/integrity-links/${tableId}/joinable-columns`)
      .flush(columns)
    await fixture.whenStable()
  }

  function addColumn(columnName: string) {
    component.selectPendingColumn(columnName)
    component.confirmAddColumn()
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinConfigComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('/test')
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(JoinConfigComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('sourceColumns', ['postal_code', 'name'])
    fixture.detectChanges()
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => {
    httpMock.verify()
  })

  it('should create and load joinable tables', async () => {
    expect(component).toBeTruthy()

    await flushTablesRequest()

    expect(component.tableChoices()).toEqual([
      { value: '', label: '-' },
      { value: 'table-1', label: 'Postal codes' },
      { value: 'table-2', label: 'stg_2' }
    ])
  })

  it('should load joinable columns and reset right column/added columns when selecting a table', async () => {
    await flushTablesRequest()

    component.selectTable('table-1')
    await flushColumnsRequest('table-1')

    expect(component.rightColumnChoices()).toEqual([
      { value: '', label: '-' },
      { value: 'city', label: 'city' },
      { value: 'region', label: 'region' }
    ])
    expect(component.selectedRightColumn()).toBe('')
    expect(component.joinColumns()).toEqual([])
  })

  it('should emit null until table, left and right columns are all selected', async () => {
    await flushTablesRequest()
    const spy = vi.fn()
    component.joinChanged.subscribe(spy)

    component.selectTable('table-1')
    await flushColumnsRequest('table-1')
    expect(spy).toHaveBeenLastCalledWith(null)

    component.selectLeftColumn('postal_code')
    expect(spy).toHaveBeenLastCalledWith(null)

    component.selectRightColumn('city')
    expect(spy).toHaveBeenLastCalledWith({
      table_id: 'table-1',
      left_column: 'postal_code',
      right_column: 'city',
      columns: []
    })
  })

  it('should add a column and exclude it from the available list', async () => {
    await flushTablesRequest()
    component.selectTable('table-1')
    await flushColumnsRequest('table-1')
    component.selectLeftColumn('postal_code')
    component.selectRightColumn('city')

    const spy = vi.fn()
    component.joinChanged.subscribe(spy)
    addColumn('city')

    expect(component.joinColumns()).toEqual([{ column_name: 'city' }])
    expect(component.availableOutputColumns()).toEqual([
      { value: 'region', label: 'region' }
    ])
    expect(spy).toHaveBeenCalledWith({
      table_id: 'table-1',
      left_column: 'postal_code',
      right_column: 'city',
      columns: [{ column_name: 'city' }]
    })
  })

  it('should not add the same column twice', async () => {
    await flushTablesRequest()
    component.selectTable('table-1')
    await flushColumnsRequest('table-1')
    component.selectLeftColumn('postal_code')
    component.selectRightColumn('city')

    addColumn('city')
    addColumn('city')

    expect(component.joinColumns()).toEqual([{ column_name: 'city' }])
  })

  it('should remove a column', async () => {
    await flushTablesRequest()
    component.selectTable('table-1')
    await flushColumnsRequest('table-1')
    component.selectLeftColumn('postal_code')
    component.selectRightColumn('city')
    addColumn('city')

    component.removeColumn('city')

    expect(component.joinColumns()).toEqual([])
    expect(component.availableOutputColumns()).toEqual([
      { value: 'city', label: 'city' },
      { value: 'region', label: 'region' }
    ])
  })

  it('should swap a row to a different column via onRowColumnChange', async () => {
    await flushTablesRequest()
    component.selectTable('table-1')
    await flushColumnsRequest('table-1')
    component.selectLeftColumn('postal_code')
    component.selectRightColumn('city')
    addColumn('city')

    component.onRowColumnChange('city', 'region')

    expect(component.joinColumns()).toEqual([{ column_name: 'region' }])
  })

  it('should remove a row when onRowColumnChange is called with an empty value', async () => {
    await flushTablesRequest()
    component.selectTable('table-1')
    await flushColumnsRequest('table-1')
    component.selectLeftColumn('postal_code')
    component.selectRightColumn('city')
    addColumn('city')

    component.onRowColumnChange('city', '')

    expect(component.joinColumns()).toEqual([])
  })

  it('should clear the pending column after confirming an add', async () => {
    await flushTablesRequest()
    component.selectTable('table-1')
    await flushColumnsRequest('table-1')
    component.selectLeftColumn('postal_code')
    component.selectRightColumn('city')

    component.selectPendingColumn('region')
    component.confirmAddColumn()

    expect(component.pendingColumn()).toBe('')
  })

  it('should reset right column and added columns when switching to a different table', async () => {
    await flushTablesRequest()
    component.selectTable('table-1')
    await flushColumnsRequest('table-1')
    component.selectLeftColumn('postal_code')
    component.selectRightColumn('city')
    addColumn('city')

    component.selectTable('table-2')
    await flushColumnsRequest('table-2')

    expect(component.selectedRightColumn()).toBe('')
    expect(component.joinColumns()).toEqual([])
  })

  it('should initialize selection from the value input', async () => {
    const initialJoin: Join = {
      table_id: 'table-1',
      left_column: 'postal_code',
      right_column: 'city',
      columns: [{ column_name: 'region' }]
    }
    fixture.componentRef.setInput('value', initialJoin)
    fixture.detectChanges()

    await flushTablesRequest()
    await flushColumnsRequest('table-1')

    expect(component.selectedTableId()).toBe('table-1')
    expect(component.selectedLeftColumn()).toBe('postal_code')
    expect(component.selectedRightColumn()).toBe('city')
    expect(component.joinColumns()).toEqual([{ column_name: 'region' }])
  })
})
