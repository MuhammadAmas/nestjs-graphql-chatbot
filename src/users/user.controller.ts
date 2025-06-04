import { Controller, Post, Body, Get } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('signup')
  async signUp(@Body() body: { email: string; password: string }) {
    console.log('in signup');
    return this.userService.signUp(body.email, body.password);
  }

  @Post('signin')
  async signIn(@Body() body: { email: string; password: string }) {
    return this.userService.signIn(body.email, body.password);
  }

  @Post('signout')
  async signOut() {
    return this.userService.signOut();
  }

  @Get('me')
  async getCurrentUser() {
    return this.userService.getCurrentUser();
  }
}
