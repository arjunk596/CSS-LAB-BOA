#include <stdio.h>
#include <string.h>

void secret_win(void) {
    printf("\n*** secret_win() reached ***\n\n");
}

void secure_read(char *input) {
    char buffer[16];
    strncpy(buffer, input, sizeof(buffer) - 1);
    buffer[sizeof(buffer) - 1] = '\0';
    printf("Buffer: %s\n", buffer);
}

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("Usage: %s <string>\n", argv[0]); return 1; }
    secure_read(argv[1]);
    printf("Returned safely.\n");
    return 0;
}
