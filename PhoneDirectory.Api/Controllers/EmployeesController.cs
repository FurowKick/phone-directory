using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhoneDirectory.Api.Data;
using PhoneDirectory.Api.Models;
using Microsoft.AspNetCore.Authorization;
using BCrypt.Net;

namespace PhoneDirectory.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public EmployeesController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Employee>>> GetEmployees()
    {
        return await _context.Employees.ToListAsync();
    }

    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<Employee>>> SearchEmployees([FromQuery] string? query)
    {
        var all = await _context.Employees.ToListAsync();

        if (string.IsNullOrWhiteSpace(query))
            return all;

        var lowerQuery = query.Trim().ToLowerInvariant();
        var filtered = all.Where(e =>
            (e.FirstName?.ToLowerInvariant().Contains(lowerQuery) == true) ||
            (e.LastName?.ToLowerInvariant().Contains(lowerQuery) == true) ||
            (e.MiddleName?.ToLowerInvariant().Contains(lowerQuery) == true) ||
            (e.Position?.ToLowerInvariant().Contains(lowerQuery) == true) ||
            (e.Department?.ToLowerInvariant().Contains(lowerQuery) == true) ||
            (e.InternalPhone?.Contains(lowerQuery) == true) ||
            (e.CityPhone?.Contains(lowerQuery) == true) ||
            (e.MobilePhone?.Contains(lowerQuery) == true)
        ).ToList();

        return filtered;
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Employee>> CreateEmployee(CreateEmployeeDto dto)
    {
        if (!string.IsNullOrWhiteSpace(dto.Login) && !string.IsNullOrWhiteSpace(dto.Password))
        {
            if (await _context.Users.AnyAsync(u => u.Username == dto.Login))
            {
                return BadRequest("Пользователь с таким логином уже существует");
            }

            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = dto.Login,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = "Subscriber"
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var employee = new Employee
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                MiddleName = dto.MiddleName,
                Position = dto.Position,
                Department = dto.Department,
                Building = dto.Building,
                OfficeNumber = dto.OfficeNumber,
                InternalPhone = dto.InternalPhone,
                CityPhone = dto.CityPhone,
                MobilePhone = dto.MobilePhone,
                Email = dto.Email,
                Address = dto.Address,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEmployees), new { id = employee.Id }, employee);
        }
        else
        {
            var employee = new Employee
            {
                Id = Guid.NewGuid(),
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                MiddleName = dto.MiddleName,
                Position = dto.Position,
                Department = dto.Department,
                Building = dto.Building,
                OfficeNumber = dto.OfficeNumber,
                InternalPhone = dto.InternalPhone,
                CityPhone = dto.CityPhone,
                MobilePhone = dto.MobilePhone,
                Email = dto.Email,
                Address = dto.Address,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEmployees), new { id = employee.Id }, employee);
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteEmployee(Guid id)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee == null)
            return NotFound();

        _context.Employees.Remove(employee);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("profile")]
    public async Task<ActionResult<Employee>> GetMyProfile()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return BadRequest("Не удалось определить пользователя");
        }

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.UserId == userId);

        if (employee == null)
            return NotFound("Ваша карточка не найдена");

        return employee;
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateMyProfile(Employee employee)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return BadRequest("Не удалось определить пользователя");
        }

        var existing = await _context.Employees
            .FirstOrDefaultAsync(e => e.UserId == userId);

        if (existing == null)
            return NotFound("Ваша карточка не найдена");

        try
        {
            existing.FirstName = employee.FirstName;
            existing.LastName = employee.LastName;
            existing.MiddleName = employee.MiddleName;
            existing.Position = employee.Position;
            existing.Department = employee.Department;
            existing.Building = employee.Building;
            existing.OfficeNumber = employee.OfficeNumber;
            existing.InternalPhone = employee.InternalPhone;
            existing.CityPhone = employee.CityPhone;
            existing.MobilePhone = employee.MobilePhone;
            existing.Email = employee.Email;
            existing.Address = employee.Address;
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Ошибка сервера: {ex.Message}");
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateEmployee(Guid id, Employee employee)
    {
        var existing = await _context.Employees.FindAsync(id);
        if (existing == null)
            return NotFound();

        try
        {
            existing.FirstName = employee.FirstName;
            existing.LastName = employee.LastName;
            existing.MiddleName = employee.MiddleName;
            existing.Position = employee.Position;
            existing.Department = employee.Department;
            existing.Building = employee.Building;
            existing.OfficeNumber = employee.OfficeNumber;
            existing.InternalPhone = employee.InternalPhone;
            existing.CityPhone = employee.CityPhone;
            existing.MobilePhone = employee.MobilePhone;
            existing.Email = employee.Email;
            existing.Address = employee.Address;
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Ошибка сервера: {ex.Message}");
        }
    }
}