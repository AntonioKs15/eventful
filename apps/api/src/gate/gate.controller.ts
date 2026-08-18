import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@eventful/contracts';
import { Roles } from '../auth/decorators/roles.decorator';
import { ValidateTicketDto } from './dto/validate-ticket.dto';
import { GateService, GateValidationOutcome } from './gate.service';

@ApiTags('gate')
@Controller('gate')
export class GateController {
  constructor(private readonly gateService: GateService) {}

  @Roles(UserRole.GATE)
  @Post('validate')
  @ApiOperation({
    summary:
      'Validates a ticket at the door. The same endpoint serves both camera-scanned and manually-typed codes.',
  })
  validate(@Body() body: ValidateTicketDto): Promise<GateValidationOutcome> {
    return this.gateService.validate(body.eventId, body.payload);
  }
}
