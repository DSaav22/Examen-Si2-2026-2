import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CuentaAuthGuard, CurrentCuenta, PlataformaGuard, type CuentaSesion } from '../auth/cuenta-auth.guard';
import {
  EntrarDto,
  LoginCuentaDto,
  ReenviarDto,
  RegistroCuentaDto,
  RenovarDto,
  SuscribirDto,
  VerificarDto,
} from './plataforma.dto';
import { PlataformaService } from './plataforma.service';
import { metodosSimuladosPorPais } from '../pagos/metodos-pais';

@Controller('plataforma')
export class PlataformaController {
  constructor(private readonly plataforma: PlataformaService) {}

  @Get('directorio')
  directorio() {
    return this.plataforma.directorio();
  }

  @Get('planes')
  planes() {
    return this.plataforma.planes();
  }

  /** Catálogo informativo: no ejecuta cobros ni garantiza disponibilidad real. */
  @Get('paises/:pais/metodos-pago')
  metodosPago(@Param('pais') pais: string) {
    return { pais: pais.toUpperCase(), metodos: metodosSimuladosPorPais(pais), modo: 'simulado' };
  }

  @Get('slug-disponible')
  slugDisponible(@Query('slug') slug = '') {
    return this.plataforma.slugDisponible(slug);
  }

  @Post('registro')
  registro(@Body() dto: RegistroCuentaDto) {
    return this.plataforma.registrar(dto);
  }

  @Post('verificar')
  verificar(@Body() dto: VerificarDto) {
    return this.plataforma.verificar(dto.token);
  }

  @Post('reenviar-verificacion')
  reenviar(@Body() dto: ReenviarDto) {
    return this.plataforma.reenviar(dto.email);
  }

  @Post('login')
  login(@Body() dto: LoginCuentaDto) {
    return this.plataforma.login(dto);
  }

  @Get('cuenta')
  @UseGuards(CuentaAuthGuard)
  cuenta(@CurrentCuenta() cuenta: CuentaSesion) {
    return this.plataforma.miCuenta(cuenta.cuentaId);
  }

  @Post('suscribir')
  @UseGuards(CuentaAuthGuard)
  suscribir(@CurrentCuenta() cuenta: CuentaSesion, @Body() dto: SuscribirDto) {
    return this.plataforma.suscribir(cuenta.cuentaId, dto);
  }

  @Post('entrar')
  @UseGuards(CuentaAuthGuard)
  entrar(@CurrentCuenta() cuenta: CuentaSesion, @Body() dto: EntrarDto) {
    return this.plataforma.entrar(cuenta.cuentaId, dto.tiendaId);
  }

  @Get('tiendas/:id')
  @UseGuards(CuentaAuthGuard)
  detalle(@CurrentCuenta() cuenta: CuentaSesion, @Param('id') id: string) {
    return this.plataforma.detalleTienda(cuenta.cuentaId, id);
  }

  @Post('tiendas/:id/renovar')
  @UseGuards(CuentaAuthGuard)
  renovar(@CurrentCuenta() cuenta: CuentaSesion, @Param('id') id: string, @Body() dto: RenovarDto) {
    return this.plataforma.renovar(cuenta.cuentaId, id, dto);
  }

  @Get('admin/metricas')
  @UseGuards(CuentaAuthGuard, PlataformaGuard)
  metricas() {
    return this.plataforma.metricas();
  }
}
