#include <stdio.h>

void secure_format(char *input) {
    char buffer[32];
    snprintf(buffer, sizeof(buffer), "User: %s", input);
    printf("%s\n", buffer);
}

int main(int argc, char *argv[]) {
    if (argc < 2) { printf("Usage: %s <string>\n", argv[0]); return 1; }
    secure_format(argv[1]);
    printf("Returned safely.\n");
    return 0;
}
